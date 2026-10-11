import { GoogleGenAI } from '@google/genai';
import { db, GoalItem, GoalMilestone } from '../storage/db.js';
import { googleWorkspace } from './googleWorkspaceService.js';
import { googleAuth } from './googleAuthService.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export class GoalPlannerService {
  /**
   * Reverse-engineers a project plan from the target outcome and deadline,
   * generates a Google Sheet with formula calculations, and inserts the
   * Daily North Star into Google Tasks.
   */
  async planAndCreateGoal(
    outcome: string,
    targetDate: string,
    milestoneFrequency: 'weekly' | 'biweekly' | 'monthly' = 'weekly',
    userEmail?: string
  ): Promise<GoalItem> {
    const norm = db.normalizeEmail(userEmail);

    // 1. Ask Gemini to reverse-engineer milestones and North Stars
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const todayStr = new Date().toISOString().split('T')[0];

    const prompt = `
You are Aura, a personal AI assistant specializing in reverse-engineered project execution.
Today's Date: ${todayStr}
Target Outcome: "${outcome}"
Final Deadline: "${targetDate}"
Milestone Frequency: "${milestoneFrequency}"

Break down this outcome into reverse-engineered milestones working backwards from the deadline.
Requirements:
1. Provide 3 to 6 logical sequential milestones with dates between today and the target date.
2. For each milestone, provide an exact title, deadline date (YYYY-MM-DD), and a concrete "North Star Task".
3. Provide the SINGLE highest-leverage "Daily North Star" action item that the user should execute TODAY.
4. Format strictly as JSON with this schema:
{
  "milestones": [
    {
      "title": "Milestone title",
      "targetDate": "YYYY-MM-DD",
      "northStarTask": "Concrete execution task"
    }
  ],
  "dailyNorthStar": "Imperative verb task for today"
}
`;

    let generatedPlan = {
      milestones: [] as Array<{ title: string; targetDate: string; northStarTask: string }>,
      dailyNorthStar: `Initiate discovery and project setup for "${outcome}"`,
    };

    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(res.text || '{}');
      if (Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
        generatedPlan.milestones = parsed.milestones;
      }
      if (parsed.dailyNorthStar) {
        generatedPlan.dailyNorthStar = parsed.dailyNorthStar;
      }
    } catch (err: any) {
      console.warn('[GoalPlanner] AI generation fallback:', err.message);
      // Fallback deterministic milestones if API is slow
      generatedPlan.milestones = [
        {
          title: 'Phase 1: Architecture & Foundations',
          targetDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          northStarTask: 'Define scope, requirements and initial assets',
        },
        {
          title: 'Phase 2: Execution & Core Delivery',
          targetDate: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
          northStarTask: 'Build core deliverables and test functionality',
        },
        {
          title: 'Phase 3: Final Launch & Review',
          targetDate: targetDate,
          northStarTask: `Achieve final outcome: ${outcome}`,
        },
      ];
    }

    const milestonesWithIds: GoalMilestone[] = generatedPlan.milestones.map((m, idx) => ({
      id: `ms-${Date.now()}-${idx}`,
      title: m.title,
      targetDate: m.targetDate,
      completed: false,
      northStarTask: m.northStarTask,
    }));

    // 2. If Google Workspace is connected, generate the native Google Sheet
    let sheetUrl: string | undefined;
    let sheetId: string | undefined;

    const isGoogleAuth = googleAuth.isAuthenticated(norm);
    if (isGoogleAuth) {
      try {
        const rows: (string | number)[][] = [
          ['PROJECT_GOAL', outcome, '', ''],
          ['TARGET_DEADLINE', targetDate, '', ''],
          ['DAILY_NORTH_STAR', generatedPlan.dailyNorthStar, '', ''],
          ['', '', '', ''],
          ['MILESTONE_ID', 'MILESTONE_TITLE', 'TARGET_DATE', 'STATUS', 'NORTH_STAR_TASK'],
        ];

        milestonesWithIds.forEach((m, idx) => {
          rows.push([
            `M-${idx + 1}`,
            m.title,
            m.targetDate,
            'PENDING',
            m.northStarTask,
          ]);
        });

        // Add formula row at the end
        rows.push(['', '', '', '', '']);
        rows.push(['TOTAL_MILESTONES', `=COUNTA(B6:B${rows.length - 2})`, '', '', '']);

        const sheetTitle = `Aura Project: ${outcome.slice(0, 40)}`;
        const sheetRes = await googleWorkspace.createSpreadsheet(sheetTitle, rows, norm);
        sheetUrl = sheetRes.url;
        sheetId = sheetRes.spreadsheetId;
        console.log(`[GoalPlanner] Created native Google Sheet for goal: ${sheetUrl}`);
      } catch (sheetErr: any) {
        console.warn('[GoalPlanner] Could not create Google Sheet:', sheetErr.message);
      }
    }

    // 3. Insert Daily North Star into Google Tasks and local tasks
    let googleTaskId: string | undefined;
    if (isGoogleAuth) {
      try {
        const gTask = await googleWorkspace.createGoogleTask(
          `★ North Star: ${generatedPlan.dailyNorthStar}`,
          `Project Goal: ${outcome}\nDeadline: ${targetDate}${sheetUrl ? `\nGoogle Sheet: ${sheetUrl}` : ''}`,
          new Date().toISOString(),
          norm
        );
        googleTaskId = gTask.id;
        console.log(`[GoalPlanner] Synced Daily North Star to Google Tasks (ID: ${googleTaskId})`);
      } catch (taskErr: any) {
        console.warn('[GoalPlanner] Could not sync Daily North Star to Google Tasks:', taskErr.message);
      }
    }

    // Also add to Aura's local task board
    db.addTask(norm, {
      title: `★ North Star: ${generatedPlan.dailyNorthStar}`,
      source: 'voice',
      urgency: 'high',
      completed: false,
      deadline: todayStr,
    });

    // 4. Save goal item in database
    const savedGoal = db.addGoal(norm, {
      outcome,
      targetDate,
      status: 'active',
      milestoneFrequency,
      googleSheetUrl: sheetUrl,
      googleSheetId: sheetId,
      milestones: milestonesWithIds,
      dailyNorthStar: generatedPlan.dailyNorthStar,
      googleTaskId,
    });

    db.addNotification(norm, {
      title: 'New Goal & Project Sheet Created',
      message: `Reverse-engineered roadmap for "${outcome}". Google Sheet and Daily North Star task logged.`,
      type: 'success',
      status: 'completed',
    });

    return savedGoal;
  }
}

export const goalPlanner = new GoalPlannerService();
