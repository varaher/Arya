import { db } from "../db";
import { aryaGoals, aryaGoalSteps, AryaGoal, AryaGoalStep } from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export class GoalsEngine {

  async createGoal(
    tenantId: string,
    title: string,
    description?: string,
    steps?: string[],
    priority?: 'low' | 'medium' | 'high' | 'critical',
    conversationId?: number
  ): Promise<AryaGoal & { steps: AryaGoalStep[] }> {
    const [goal] = await db.insert(aryaGoals).values({
      tenantId,
      title,
      description: description || null,
      status: 'active',
      priority: priority || 'medium',
      conversationId: conversationId || null,
    }).returning();

    const createdSteps: AryaGoalStep[] = [];
    if (steps && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const [step] = await db.insert(aryaGoalSteps).values({
          goalId: goal.id,
          description: steps[i],
          status: 'pending',
          order: i + 1,
        }).returning();
        createdSteps.push(step);
      }
    }

    return { ...goal, steps: createdSteps };
  }

  async getGoals(tenantId: string, status?: string): Promise<(AryaGoal & { steps: AryaGoalStep[] })[]> {
    let conditions: any[] = [eq(aryaGoals.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(aryaGoals.status, status as any));
    }

    const goals = await db
      .select()
      .from(aryaGoals)
      .where(and(...conditions))
      .orderBy(desc(aryaGoals.createdAt));

    const result: (AryaGoal & { steps: AryaGoalStep[] })[] = [];
    for (const goal of goals) {
      const steps = await db
        .select()
        .from(aryaGoalSteps)
        .where(eq(aryaGoalSteps.goalId, goal.id))
        .orderBy(asc(aryaGoalSteps.order));
      result.push({ ...goal, steps });
    }

    return result;
  }

  async updateStepStatus(
    stepId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  ): Promise<boolean> {
    const [step] = await db
      .select()
      .from(aryaGoalSteps)
      .where(eq(aryaGoalSteps.id, stepId))
      .limit(1);

    if (!step) return false;

    await db
      .update(aryaGoalSteps)
      .set({
        status,
        completedAt: status === 'completed' ? new Date() : null,
      })
      .where(eq(aryaGoalSteps.id, stepId));

    const allSteps = await db
      .select()
      .from(aryaGoalSteps)
      .where(eq(aryaGoalSteps.goalId, step.goalId));

    const completedCount = allSteps.filter(s =>
      s.id === stepId ? status === 'completed' : s.status === 'completed'
    ).length;
    const progress = Math.round((completedCount / allSteps.length) * 100);

    const goalUpdate: any = { progress, updatedAt: new Date() };
    if (progress === 100) {
      goalUpdate.status = 'completed';
      goalUpdate.completedAt = new Date();
    }

    await db
      .update(aryaGoals)
      .set(goalUpdate)
      .where(eq(aryaGoals.id, step.goalId));

    return true;
  }

  async updateGoalStatus(
    goalId: string,
    status: 'active' | 'completed' | 'paused' | 'cancelled'
  ): Promise<boolean> {
    const [goal] = await db
      .select()
      .from(aryaGoals)
      .where(eq(aryaGoals.id, goalId))
      .limit(1);

    if (!goal) return false;

    await db
      .update(aryaGoals)
      .set({
        status,
        updatedAt: new Date(),
        completedAt: status === 'completed' ? new Date() : null,
      })
      .where(eq(aryaGoals.id, goalId));

    return true;
  }

  async deleteGoal(goalId: string): Promise<boolean> {
    await db.delete(aryaGoalSteps).where(eq(aryaGoalSteps.goalId, goalId));
    await db.delete(aryaGoals).where(eq(aryaGoals.id, goalId));
    return true;
  }
}
