import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';
import { Zap, X, Coins, TrendingUp, Unlock, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const CheatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const level = useGameStore(state => state.level);
  const budcoins = useGameStore(state => state.budcoins);
  const gems = useGameStore(state => state.gems);

  const handleAddCoins = () => {
    useGameStore.getState().cheatAddCoins(10000);
    toast.success('+10,000 $!');
  };

  const handleAddGems = () => {
    useGameStore.setState(state => ({ gems: state.gems + 50 }));
    toast.success('+50 Gems!');
  };

  const handleAddLevel = () => {
    useGameStore.getState().cheatAddLevel();
    toast.success(`Level Up! Jetzt Level ${useGameStore.getState().level}`);
  };

  const handleSetLevel20 = () => {
    useGameStore.getState().cheatSetLevel(20);
    toast.success('Level auf 20 gesetzt!');
  };

  const handleAddSeeds = () => {
    useGameStore.getState().cheatAddSeeds(5);
    toast.success('+5 zufällige Seeds!');
  };

  const handleUnlockAllSlots = () => {
    useGameStore.getState().cheatUnlockAllSlots();
    toast.success('Alle Grow-Slots freigeschaltet!');
  };

  const handleUnlockDryingRacks = () => {
    useGameStore.setState(state => ({
      dryingRacks: state.dryingRacks.map(r => ({ ...r, isUnlocked: true }))
    }));
    toast.success('Alle Trocknungsgestelle freigeschaltet!');
  };

  const handleUnlockAllWorkers = () => {
    useGameStore.getState().cheatUnlockAllWorkers();
    toast.success('Alle Worker freigeschaltet!');
  };

  const handleUnlockAllChannels = () => {
    useGameStore.setState(state => ({
      salesChannels: state.salesChannels.map(c => ({ ...c, isUnlocked: true }))
    }));
    toast.success('Alle Verkaufskanäle freigeschaltet!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full border-2 border-neon-purple/50 bg-neon-purple/10 hover:bg-neon-purple/20 text-neon-purple"
        >
          <Zap className="mr-2" size={18} />
          Cheat Panel öffnen
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-neon-purple">
            <Zap size={20} />
            Cheat Panel
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Debug-Tools fuer schnelles Testen von Fortschritt und Ressourcen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Current Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted">
              <div className="text-lg font-bold text-primary">{level}</div>
              <div className="text-[10px] text-muted-foreground">Level</div>
            </div>
            <div className="p-2 rounded-lg bg-muted">
              <div className="text-lg font-bold text-resource-budcoin">{budcoins.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">Coins</div>
            </div>
            <div className="p-2 rounded-lg bg-muted">
              <div className="text-lg font-bold text-resource-gems">{gems}</div>
              <div className="text-[10px] text-muted-foreground">Gems</div>
            </div>
          </div>

          {/* Resource Cheats */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Coins size={12} /> Ressourcen
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="secondary" 
                onClick={handleAddCoins}
                className="bg-resource-budcoin/20 hover:bg-resource-budcoin/30 text-resource-budcoin border-0"
              >
                +10k 💰
              </Button>
              <Button 
                variant="secondary"
                onClick={handleAddGems}
                className="bg-resource-gems/20 hover:bg-resource-gems/30 text-resource-gems border-0"
              >
                +50 💎
              </Button>
            </div>
          </div>

          {/* Level Cheats */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <TrendingUp size={12} /> Level
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="secondary"
                onClick={handleAddLevel}
                className="bg-secondary/20 hover:bg-secondary/30 text-secondary border-0"
              >
                +1 Level ⬆️
              </Button>
              <Button 
                variant="secondary"
                onClick={handleSetLevel20}
                className="bg-neon-gold/20 hover:bg-neon-gold/30 text-neon-gold border-0"
              >
                Level 20 🚀
              </Button>
            </div>
          </div>

          {/* Unlock Cheats */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Unlock size={12} /> Freischalten
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="secondary"
                onClick={handleAddSeeds}
                className="bg-resource-seeds/20 hover:bg-resource-seeds/30 text-resource-seeds border-0"
              >
                +5 Seeds 🌱
              </Button>
              <Button 
                variant="secondary"
                onClick={handleUnlockAllSlots}
                className="bg-primary/20 hover:bg-primary/30 text-primary border-0"
              >
                Grow Slots 🌿
              </Button>
              <Button 
                variant="secondary"
                onClick={handleUnlockDryingRacks}
                className="bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border-0"
              >
                Dry Racks 🌬️
              </Button>
              <Button 
                variant="secondary"
                onClick={handleUnlockAllChannels}
                className="bg-neon-orange/20 hover:bg-neon-orange/30 text-neon-orange border-0"
              >
                Verkauf 💵
              </Button>
            </div>
          </div>

          {/* Worker Cheats */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Users size={12} /> Worker
            </h4>
            <Button 
              variant="secondary"
              onClick={handleUnlockAllWorkers}
              className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border-0"
            >
              Alle Worker freischalten 👔
            </Button>
          </div>

          {/* Close Button */}
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="w-full mt-4"
          >
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
