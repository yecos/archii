import React, { useMemo } from 'react';
import { useAuth } from '@/hooks/useDomain';
import { useFirestore } from '@/hooks/useDomain';
import { useInvoice } from '@/hooks/useDomain';
import { useComments } from '@/hooks/useDomain';
import WelcomeHeader from './WelcomeHeader';
import KpiCards from './KpiCards';
import ProjectCardsGrid from './ProjectCardsGrid';
import type { ActivityItem } from './ProjectCard';

interface OverviewViewProps {
  onSelectProject: (id: string) => void;
}

export default function OverviewView({ onSelectProject }: OverviewViewProps) {
  const auth = useAuth();
  const fs = useFirestore();
  const inv = useInvoice();
  const cmt = useComments();

  // Filter projects visible to current user
  const myProjects = useMemo(
    () => auth.visibleProjects(fs.projects),
    [auth, fs.projects],
  );

  const activeProjects = useMemo(
    () => myProjects.filter((p) => !['Completado', 'Cancelado'].includes(p.data.status)),
    [myProjects],
  );

  const myInvoices = useMemo(
    () =>
      inv.invoices.filter((i: any) =>
        myProjects.some((p) => p.id === i.data.projectId),
      ),
    [inv.invoices, myProjects],
  );

  const pendingInvoices = useMemo(
    () =>
      myInvoices.filter(
        (i: any) => i.data.status === 'Enviada' || i.data.status === 'Borrador',
      ),
    [myInvoices],
  );

  // Get last 3 activity items per project (comments + daily logs combined)
  const getProjectActivity = useMemo(() => {
    const map: Record<string, ActivityItem[]> = {};
    myProjects.forEach((p) => {
      const items: ActivityItem[] = [];
      // Recent comments for this project
      cmt.comments
        .filter((c) => c.data.projectId === p.id)
        .slice(-5)
        .reverse()
        .forEach((c) => {
          items.push({
            id: c.id,
            text: c.data.text?.substring(0, 80) || '',
            time: c.data.createdAt,
            icon: '💬',
          });
        });
      // Recent daily logs for this project
      cmt.dailyLogs
        .filter((l) => l.data.projectId === p.id)
        .slice(0, 3)
        .forEach((l) => {
          items.push({
            id: l.id,
            text: `📝 ${l.data.date} — ${(l.data.activities || []).slice(0, 2).join(', ') || 'Sin actividades'}`,
            time: l.data.createdAt,
            icon: '📝',
          });
        });
      items.sort((a, b) => {
        const ta = a.time?.toDate?.() || new Date(0);
        const tb = b.time?.toDate?.() || new Date(0);
        return tb.getTime() - ta.getTime();
      });
      map[p.id] = items.slice(0, 3);
    });
    return map;
  }, [cmt.comments, cmt.dailyLogs, myProjects]);

  // Budget info per project
  const getProjectBudget = (projectId: string) => {
    const exps = fs.expenses.filter((e: any) => e.data.projectId === projectId);
    const spent = exps.reduce((s: number, e: any) => s + (Number(e.data.amount) || 0), 0);
    const budget = fs.projects.find((p) => p.id === projectId)?.data?.budget || 0;
    return { spent, budget };
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Welcome Header */}
      <WelcomeHeader userName={auth.userName} initials={auth.initials} />

      {/* KPI Cards */}
      <KpiCards
        totalProjects={myProjects.length}
        activeProjects={activeProjects.length}
        completedProjects={myProjects.filter((p) => p.data.status === 'Completado').length}
        pendingInvoices={pendingInvoices.length}
      />

      {/* Project Cards Grid */}
      <ProjectCardsGrid
        projects={myProjects}
        onSelectProject={onSelectProject}
        getProjectBudget={getProjectBudget}
        getProjectActivity={getProjectActivity}
      />
    </div>
  );
}
