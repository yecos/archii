'use client';
import React, { useState } from 'react';
import { type PortalTab } from '@/components/features/portal/statusHelpers';
import OverviewView from '@/components/features/portal/OverviewView';
import ProjectDetailView from '@/components/features/portal/ProjectDetailView';

export default function PortalScreen() {
  const [view, setView] = useState<PortalTab>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setView('project-detail');
  };

  const handleBack = () => {
    setSelectedProjectId(null);
    setView('overview');
  };

  return (
    <div className="animate-fadeIn">
      {view === 'overview' && <OverviewView onSelectProject={handleSelectProject} />}
      {view === 'project-detail' && selectedProjectId && (
        <ProjectDetailView projectId={selectedProjectId} onBack={handleBack} />
      )}
    </div>
  );
}
