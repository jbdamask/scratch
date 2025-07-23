import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Plus, FolderOpen, FileText } from 'lucide-react';
import { chatDb, type Project, type ChatSession } from '@/lib/database';
import { cn } from '@/lib/utils';

interface ProjectManagerProps {
  currentProject: Project | null;
  currentSession: ChatSession | null;
  onProjectChange: (project: Project) => void;
  onSessionChange: (session: ChatSession) => void;
  onNewSession: () => void;
  onExportDocument: () => void;
  className?: string;
}

export function ProjectManager({
  currentProject,
  currentSession,
  onProjectChange,
  onSessionChange,
  onNewSession,
  onExportDocument,
  className
}: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: '',
    industry: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadSessions(currentProject.id);
    }
  }, [currentProject]);

  const loadProjects = () => {
    const allProjects = chatDb.getProjects();
    setProjects(allProjects);
    
    // If no current project but projects exist, select the first one
    if (!currentProject && allProjects.length > 0) {
      onProjectChange(allProjects[0]);
    }
  };

  const loadSessions = (projectId: string) => {
    const projectSessions = chatDb.getSessionsByProject(projectId);
    setSessions(projectSessions);
  };

  const handleCreateProject = () => {
    if (!newProjectForm.name.trim()) return;

    const projectId = chatDb.createProject(
      newProjectForm.name,
      newProjectForm.description,
      newProjectForm.industry
    );

    const newProject = chatDb.getProject(projectId);
    if (newProject) {
      setProjects(prev => [newProject, ...prev]);
      onProjectChange(newProject);
      
      // Create initial session
      const sessionId = chatDb.createSession(projectId, 'Initial Analysis');
      const newSession = chatDb.getSession(sessionId);
      if (newSession) {
        onSessionChange(newSession);
      }
    }

    setNewProjectForm({ name: '', description: '', industry: '' });
    setShowNewProjectDialog(false);
  };

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      onProjectChange(project);
      
      // Select first session if available
      const projectSessions = chatDb.getSessionsByProject(projectId);
      if (projectSessions.length > 0) {
        onSessionChange(projectSessions[0]);
      }
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      onSessionChange(session);
    }
  };

  return (
    <div className={cn("flex items-center space-x-3 p-4 border-b bg-muted/30", className)}>
      {/* Project Selector */}
      <div className="flex items-center space-x-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <Select value={currentProject?.id || ''} onValueChange={handleProjectSelect}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select project..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                <div>
                  <div className="font-medium">{project.name}</div>
                  {project.industry && (
                    <div className="text-xs text-muted-foreground">{project.industry}</div>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Session Selector */}
      {currentProject && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Session:</span>
          <Select value={currentSession?.id || ''} onValueChange={handleSessionSelect}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select session..." />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(session => (
                <SelectItem key={session.id} value={session.id}>
                  {session.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1" />

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {currentProject && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onNewSession}
              className="h-8"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Session
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onExportDocument}
              className="h-8"
            >
              <FileText className="h-3 w-3 mr-1" />
              Export Report
            </Button>
          </>
        )}

        <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="h-3 w-3 mr-1" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Industry (Optional)</label>
                <Input
                  value={newProjectForm.industry}
                  onChange={(e) => setNewProjectForm(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g., Technology, Healthcare, Finance..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  value={newProjectForm.description}
                  onChange={(e) => setNewProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the project..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreateProject} disabled={!newProjectForm.name.trim()}>
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}