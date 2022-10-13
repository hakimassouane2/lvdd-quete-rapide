/**
 * Extend the base Item class to implement additional system-specific logic.
 */
export default class ItemEntity extends Item {

    /** @override */
	prepareData() {
		super.prepareData();
        const item = this.data;
        switch (item.type) {
            case "resource":
                if (item.data.canHaveBulk && !item.data.bulk) {
                    item.data.bulk = 0;
                }
                if (item.data.canHaveValue && !item.data.value) {
                    item.data.value = 0;
                }
                if (item.data.canHaveCharges && !item.data.charges) {
                    item.data.charges = 0;
                }
                break;
        }
	}

    /**
     * Handle clickable rolls.
     */
    async roll(formInfos) {
        const item = this.data;
        const actorData = this.actor ? this.actor.data.data : formInfos.actor ? formInfos.actor.data.data : {};
        const targets = Array.from(game.user.targets.values())
        const contentDices = []
        const rollFormula = "d100"
        const roll = await new Roll(rollFormula, actorData).roll();
        const rolledStats = []
        let toBeat = 0

        if (targets && !formInfos.isContestRoll) {
            targets.forEach(target => {
                const actorOfTarget = target.actor

                if (actorOfTarget.type === "character") {
                    const gameUsersFiltered = game.users.filter(user => user.charname === actorOfTarget.data.name)
                    if (gameUsersFiltered.length) {
                        socket.emit('system.lvdd-quete-rapide', {
                            type: 'request-roll-player',
                            targetUserId: gameUsersFiltered[0].id,
                            payload: {
                                actor: actorOfTarget
                            }
                        });
                    }
                } else {
                    socket.emit('system.lvdd-quete-rapide', {
                        type: 'request-roll-gm',
                        payload: {
                            actor: actorOfTarget,
                            tokenId: target.id
                        }
                    });
                } 
            })
        }

        item.data.rollStats.forEach((rollStat) => {
            if (actorData.attributes[rollStat.type]) {
                rolledStats.push({ name: game.i18n.localize(`common.${rollStat.type}.name`), total: actorData.attributes[rollStat.type].total.toString()})
                toBeat += actorData.attributes[rollStat.type].total
            } else {
                rolledStats.push({ name: game.i18n.localize(`common.${rollStat.type}.name`), total: actorData.archetypes[rollStat.type].total.toString()})
                toBeat += actorData.archetypes[rollStat.type].total
            }
        })

        toBeat += parseInt(item.data.skillBonus) + (formInfos.bonusAmount || 0) + (formInfos.consumeInspiration && actorData.inspiration > 0 ? 10 : 0)
        if (toBeat > 100) {
            toBeat = 100
        } else if (toBeat < 0) {
            toBeat = 0
        }

        // Faire un roll automatique sur la table de succès ou ecehc critique selon le resultat de ce dés
        contentDices.push(`<ol class="dice-rolls">`)
        contentDices.push(`<li class="roll die d10 ${roll.dice[0].results[0].result <= 5 ? "max" : ""} ${roll.dice[0].results[0].result >= 95 ? "min" : ""}">${roll.dice[0].results[0].result}</li>`)
        contentDices.push(`</ol>`)
        ChatMessage.create({
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            speaker: ChatMessage.getSpeaker({ actor: this.actor || formInfos.actor }),
            roll,
            content: `
            <div>
                <div style="display: flex; align-items:center; margin-bottom: 0.5rem;">
                    <img src="${item.img}" width="36" height="36">
                    <h2 class="item-name" style="margin: 0.5rem 0.3rem;">
                        <b>${item.name} ${formInfos.actor ? ' (Opposition)' : ''}</b>
					</h2>
                </div>
                <p class="item-name">
                    <i>${game.boilerplate.generateStatsToRollString(this.actor || formInfos.actor, rolledStats, item)}</i><br>
                    ${game.boilerplate.generateRollBonusInfo(this.actor || formInfos.actor, formInfos, item).finalString}
                    <i>Taux de réussite : ${toBeat}%</i><br>
                    <i>Degré de réussite : <b>${Math.floor(toBeat / 10) - Math.floor(roll.total /10)}</b></i>
                    ${await game.boilerplate.handleTargets(targets) || ""}
                </p>
                <div class="dice-roll">
                    <div class="dice-result">
                    <div class="dice-formula" style="${game.boilerplate.styleGenerator(roll, toBeat)}">${game.boilerplate.successOrMiss(roll, toBeat)}</div>
                        <div class="dice-tooltip">
                            <section class="tooltip-part">
                                <div class="dice">
                                    <header class="part-header flexrow">
                                        <span class="part-formula">${roll.formula.substring(0, roll.formula.indexOf("20") + 2)}</span>
                                        <span class="part-total">${roll.total}</span>
                                    </header>
                                    ${contentDices.join("")}
                                </div>
                            </section>
                        </div>
                    <h4 class="dice-total" style="${game.boilerplate.styleGenerator(roll, toBeat)}">${roll.total}</h4>
                </div>
            </div>
            `
        });

        if (formInfos.consumeInspiration && actorData.inspiration > 0) {
            if (this.actor) {
                this.actor.update({ 'data.inspiration': actorData.inspiration -= 1 });
            } else if (formInfos.actor && formInfos.actor.type === 'character') {
                formInfos.actor.update({ 'data.inspiration': actorData.inspiration -= 1 });
            } else {
                formInfos.token.actor.update({ 'data.inspiration': actorData.inspiration -= 1 });
            }
            
        }
    }
}
