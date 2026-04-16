import ProjectCard, { ActivityItem } from './ProjectCard';
import type { Project } from '@/lib/types';

interface ProjectCardsGridProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  getProjectBudget: (projectId: string) => { spent: number; budget: number };
  getProjectActivity: Record<string, ActivityItem[]>;
}

export default function ProjectCardsGrid({
  projects,
  onSelectProject,
  getProjectBudget,
  getProjectActivity,
}: ProjectCardsGridProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--af-text3)]">
        <div className="text-4xl mb-3">📁</div>
        <div className="text-sm">No tienes proyectos asignados</div>
        <div className="text-xs mt-1">
          Los proyectos se vinculan desde el panel de administración
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold">Mis Proyectos</h2>
        <span className="text-xs text-[var(--muted-foreground)]">
          {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => {
          const prog = project.data.progress || 0;
          const { spent, budget } = getProjectBudget(project.id);
          const activityItems = getProjectActivity[project.id] || [];

          return (
            <ProjectCard
              key={project.id}
              project={project}
              progress={prog}
              spent={spent}
              budget={budget}
              activityItems={activityItems}
              onSelect={() => onSelectProject(project.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
