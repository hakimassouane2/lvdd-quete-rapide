import EditResourceDialog from "../dialogs/edit-resource.js";

export default class ItemSheetResource extends ItemSheet {

	/** @override */
	static get defaultOptions() {
		return mergeObject(
			super.defaultOptions,
			{
				classes: ["window-gqq"],
				height: 601,
				width: 350,
				template: 'systems/lvdd-quete-rapide/templates/sheets/resource.html',
				resizable: false,
				tabs: [{navSelector: ".card__tabs__nav", contentSelector: ".card__tabs__body", initial: "front"}]
			}
		);
	}

	/** @override */
    getData() {
        const data = super.getData();
		data.data.data.showExtras = data.data.data.canHaveCharges || data.data.data.canHaveBulk || data.data.data.canHaveValue;
		data.data.data.extrasCount = data.data.data.canHaveCharges + data.data.data.canHaveBulk + data.data.data.canHaveValue;
        
		return data;
    }

	activateListeners(html) {
		html.find('button[data-action="edit"]').click(this._onResourceEdit.bind(this));
		html.find('.resource__equipped').click(ev => this._onToggleEquipped(ev));
		html.find('.resource__extra--charges input').change(ev => this._onUpdateCharges(ev.target.value));
		html.find('.resource__extra--value input').change(ev => this._onUpdateValue(ev.target.value));
		html.find('.resource__extra--bulk input').change(ev => this._onUpdateBulk(ev.target.value));
		super.activateListeners(html);
	}

	_onUpdateValue(value) {
		this.item.update({
			"data.value": value
		});
	}

	_onUpdateCharges(charges) {
		this.item.update({
			"data.charges": charges
		});
	}

	_onUpdateBulk(bulk) {
		this.item.update({
			"data.bulk": bulk
		});
	}

	_onToggleEquipped() {
		this.item.update({
			"data.isEquipped": !this.item.data.data.isEquipped
		});
	}

	async _onResourceEdit(event) {
		event.preventDefault();
		try {
			let form = await EditResourceDialog.editResourceDialog({item: this.item.data});
			await this.item.update(form);
		} catch(err) {
			return;
		}
	}
}
