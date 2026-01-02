import { motion } from 'framer-motion';
import { useGameStore, SkillNode, SkillPath } from '@/store/gameStore';
import { Coins, Sparkles, Cpu, Lock, Check } from 'lucide-react';

const pathConfig: Record<SkillPath, { label: string; icon: typeof Coins; color: string; bgColor: string }> = {
  producer: { label: 'Producer', icon: Coins, color: 'text-resource-budcoin', bgColor: 'bg-resource-budcoin/20' },
  alchemist: { label: 'Alchemist', icon: Sparkles, color: 'text-resource-essence', bgColor: 'bg-resource-essence/20' },
  engineer: { label: 'Engineer', icon: Cpu, color: 'text-neon-cyan', bgColor: 'bg-neon-cyan/20' },
};

export const SkillsScreen = () => {
  const { skills, skillPoints, level, unlockSkill } = useGameStore();

  const paths: SkillPath[] = ['producer', 'alchemist', 'engineer'];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-neon-purple">Skills</h1>
          <p className="text-sm text-muted-foreground">Level {level}</p>
        </div>
        <div className="px-4 py-2 rounded-lg bg-secondary/20 border border-secondary/50">
          <span className="text-lg font-bold text-secondary">{skillPoints}</span>
          <span className="text-sm text-muted-foreground ml-1">SP</span>
        </div>
      </div>

      {/* Skill Trees */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {paths.map(path => {
          const config = pathConfig[path];
          const pathSkills = skills.filter(s => s.path === path);
          const Icon = config.icon;

          return (
            <div key={path} className="game-card p-4">
              {/* Path header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon size={24} className={config.color} />
                </div>
                <div>
                  <h2 className={`font-display font-bold ${config.color}`}>{config.label}</h2>
                  <p className="text-xs text-muted-foreground">
                    {pathSkills.filter(s => s.unlocked).length}/{pathSkills.length} unlocked
                  </p>
                </div>
              </div>

              {/* Skill nodes */}
              <div className="flex flex-col gap-2">
                {pathSkills.map((skill, index) => (
                  <SkillNodeCard
                    key={skill.id}
                    skill={skill}
                    skills={skills}
                    skillPoints={skillPoints}
                    onUnlock={() => unlockSkill(skill.id)}
                    isLast={index === pathSkills.length - 1}
                    pathColor={config.color}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SkillNodeCardProps {
  skill: SkillNode;
  skills: SkillNode[];
  skillPoints: number;
  onUnlock: () => void;
  isLast: boolean;
  pathColor: string;
}

const SkillNodeCard = ({ skill, skills, skillPoints, onUnlock, isLast, pathColor }: SkillNodeCardProps) => {
  const requirementsMet = skill.requires.every(reqId => 
    skills.find(s => s.id === reqId)?.unlocked
  );
  const canUnlock = !skill.unlocked && requirementsMet && skillPoints >= skill.cost;

  return (
    <div className="relative">
      {/* Connection line */}
      {!isLast && (
        <div className="absolute left-5 top-full w-0.5 h-2 bg-border" />
      )}

      <motion.button
        whileTap={{ scale: canUnlock ? 0.98 : 1 }}
        onClick={() => canUnlock && onUnlock()}
        disabled={!canUnlock && !skill.unlocked}
        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all
          ${skill.unlocked 
            ? 'bg-primary/10 border border-primary/30' 
            : canUnlock
              ? 'bg-muted/50 border border-primary/50 hover:bg-muted'
              : 'bg-muted/30 border border-border opacity-60'
          }
        `}
      >
        {/* Status icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center
          ${skill.unlocked 
            ? 'bg-primary text-primary-foreground' 
            : canUnlock 
              ? 'bg-muted border-2 border-primary'
              : 'bg-muted border border-border'
          }
        `}>
          {skill.unlocked ? (
            <Check size={20} />
          ) : !requirementsMet ? (
            <Lock size={16} className="text-muted-foreground" />
          ) : (
            <span className="text-sm font-bold">{skill.cost}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-left">
          <h3 className={`font-semibold ${skill.unlocked ? pathColor : 'text-foreground'}`}>
            {skill.name}
          </h3>
          <p className="text-xs text-muted-foreground">{skill.description}</p>
        </div>

        {/* Unlock indicator */}
        {canUnlock && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-bold"
          >
            UNLOCK
          </motion.div>
        )}
      </motion.button>
    </div>
  );
};
