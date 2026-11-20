import { ElementPicker } from './ElementPicker.js';
import { UpgradePicker } from './UpgradePicker.js';

export class PickFlow {
  constructor(uiOrDeps) {
    this.ui = uiOrDeps;
    this.perkOverlay = uiOrDeps.perkOverlay;
    this.meta = uiOrDeps.meta;
    this.questManager = uiOrDeps.questManager;
    this.spellbookManager = uiOrDeps.spellbookManager;
    this.onElementPicked = uiOrDeps.onElementPicked;
    this.updateSpellPanel = uiOrDeps.updateSpellPanel || ((p) => uiOrDeps.updateSpellPanel?.(p));

    this.elementPicker = new ElementPicker(this.perkOverlay);
    this.upgradePicker = new UpgradePicker(this.perkOverlay);
    this.pendingPicks = 0;
  }

  openNextElementPick(player) {
    if (this.pendingPicks <= 0 || !player.spellSlot || player.spellSlot.elements.length >= 3) {
      this.pendingPicks = 0;
      this.elementPicker.pendingPicks = 0;
      return;
    }
    this.elementPicker.show(player, (element) => {
      this.onElementPicked?.(element);
      if (player.spellSlot?.needsUpgradeChoice(element)) {
        this.upgradePicker.show(element, (upgradeId) => this.commitPick(player, element, upgradeId));
      } else {
        this.commitPick(player, element, null);
      }
    });
  }

  commitPick(player, element, upgradeId = null) {
    this.pendingPicks = Math.max(0, this.pendingPicks - 1);
    this.elementPicker.pendingPicks = this.pendingPicks;
    player.spellSlot.addElement(element, upgradeId);
    player.setSpell(player.spellSlot.currentSpell.id);
    this.updateSpellPanel?.(player);
    const meta = this.meta || this.ui?.meta;
    const sbm = this.spellbookManager || this.ui?.spellbookManager;
    const qm = this.questManager || this.ui?.questManager;
    if (sbm) sbm.recordSpellReached(player.currentSpell.id, meta);
    if (player.currentSpell.tier === 3 && qm) qm.record('reachT3', 1);
    if (this.pendingPicks > 0 && player.spellSlot.elements.length < 3) {
      this.elementPicker.clearDelay();
      this.elementPicker.timer = setTimeout(() => {
        this.elementPicker.timer = null;
        if (this.pendingPicks > 0 && player.spellSlot?.elements.length < 3) this.openNextElementPick(player);
      }, 1500);
    } else {
      this.pendingPicks = 0;
      this.elementPicker.pendingPicks = 0;
    }
  }

  hide() {
    this.reset();
  }

  reset() {
    this.elementPicker?.hide();
    this.upgradePicker?.hide();
    this.pendingPicks = 0;
  }
}
