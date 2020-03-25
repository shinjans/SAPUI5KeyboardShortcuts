sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/f/library",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"ss/zss_dyn_page_keys/libs/mousetrap"
], function (Controller, JSONModel, library, MessageBox, Fragment, MessageToast) {
	"use strict";
	var history = {
		prevPaymentSelect: null,
		prevDiffDeliverySelect: null
	};

	return Controller.extend("ss.zss_dyn_page_keys.controller.DynamicPageWithWizard", {
		onInit: function () {
			this._wizard = this.byId("ShoppingCartWizard");
			this._oNavContainer = this.byId("navContainer");
			this._oDynamicPage = this.getPage();

			Fragment.load({
				name: "ss.zss_dyn_page_keys.view.ReviewPage",
				controller: this
			}).then(function (oWizardReviewPage) {
				this._oWizardReviewPage = oWizardReviewPage;
				this._oNavContainer.addPage(this._oWizardReviewPage);
			}.bind(this));

			this.model = this.getOwnerComponent().getModel();
			this.getView().setModel(this.model);
			this.model.getData().ProductCollection.splice(5, this.model.getData().ProductCollection.length);
			this.model.setProperty("/selectedPayment", "Credit Card");
			this.model.setProperty("/selectedDeliveryMethod", "Standard Delivery");
			this.model.setProperty("/differentDeliveryAddress", false);
			this.model.setProperty("/CashOnDelivery", {});
			this.model.setProperty("/BillingAddress", {});
			this.model.setProperty("/CreditCard", {});
			this.calcTotal();
			this.model.updateBindings();
			// //	this.model.loadData(sap.ui.require.toUrl("sap/ui/demo/mock") + "/products.json");
			this._bindKeys();
		},
		getPage: function () {
			return this.byId("dynamicPage");
		},
		onExit: function () {
			if (this._oWizardReviewPage) {
				this._oWizardReviewPage.destroy();
			}
		},
		calcTotal: function () {
			var data = this.model.getData().ProductCollection;
			if (data) {
				var total = data.reduce(function (prev, current) {
					prev = prev.Price || prev;
					return prev + current.Price;
				});
				this.model.setProperty("/ProductsTotalPrice", total.Price || total);
			} else {
				this.model.setProperty("/ProductsTotalPrice", 0);
			}
		},

		handleDelete: function (listItemBase) {
			var listItem = listItemBase.getParameters().listItem;
			var data = this.model.getData().ProductCollection;
			if (data.length <= 1) {
				return;
			}

			for (var i = 0; i < data.length; i++) {
				if (data[i].Name === listItem.getTitle()) {
					data.splice(i, 1);
					this.calcTotal();
					this.model.updateBindings();
					break;
				}
			}
		},

		goToPaymentStep: function () {
			var selectedKey = this.model.getProperty("/selectedPayment");

			switch (selectedKey) {
			case "Credit Card":
				this.byId("PaymentTypeStep").setNextStep(this.getView().byId("CreditCardStep"));
				break;
			case "Bank Transfer":
				this.byId("PaymentTypeStep").setNextStep(this.getView().byId("BankAccountStep"));
				break;
			case "Cash on Delivery":
			default:
				this.byId("PaymentTypeStep").setNextStep(this.getView().byId("CashOnDeliveryStep"));
				break;
			}
		},

		setPaymentMethod: function () {
			this.setDiscardableProperty({
				message: "Are you sure you want to change the payment type ? This will discard your progress.",
				discardStep: this.byId("PaymentTypeStep"),
				modelPath: "/selectedPayment",
				historyPath: "prevPaymentSelect"
			});
		},

		setDifferentDeliveryAddress: function () {
			this.setDiscardableProperty({
				message: "Are you sure you want to change the delivery address ? This will discard your progress",
				discardStep: this.byId("BillingStep"),
				modelPath: "/differentDeliveryAddress",
				historyPath: "prevDiffDeliverySelect"
			});
		},

		setDiscardableProperty: function (params) {
			if (this._wizard.getProgressStep() !== params.discardStep) {
				MessageBox.warning(params.message, {
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: function (oAction) {
						if (oAction === MessageBox.Action.YES) {
							this._wizard.discardProgress(params.discardStep);
							history[params.historyPath] = this.model.getProperty(params.modelPath);
						} else {
							this.model.setProperty(params.modelPath, history[params.historyPath]);
						}
					}.bind(this)
				});
			} else {
				history[params.historyPath] = this.model.getProperty(params.modelPath);
			}
		},

		billingAddressComplete: function () {
			if (this.model.getProperty("/differentDeliveryAddress")) {
				this.byId("BillingStep").setNextStep(this.getView().byId("DeliveryAddressStep"));
			} else {
				this.byId("BillingStep").setNextStep(this.getView().byId("DeliveryTypeStep"));
			}
		},

		handleWizardCancel: function () {
			this._handleMessageBoxOpen("Are you sure you want to cancel your purchase?", "warning");
		},

		handleWizardSubmit: function () {
			this._handleMessageBoxOpen("Are you sure you want to submit your report?", "confirm");
		},

		backToWizardContent: function () {
			this._oNavContainer.backToPage(this._oDynamicPage.getId());
		},

		checkCreditCardStep: function () {
			var cardName = this.model.getProperty("/CreditCard/Name") || "";
			if (cardName.length < 3) {
				this._wizard.invalidateStep(this.byId("CreditCardStep"));
			} else {
				this._wizard.validateStep(this.byId("CreditCardStep"));
			}
		},

		checkCashOnDeliveryStep: function () {
			var firstName = this.model.getProperty("/CashOnDelivery/FirstName") || "";
			if (firstName.length < 3) {
				this._wizard.invalidateStep(this.byId("CashOnDeliveryStep"));
			} else {
				this._wizard.validateStep(this.byId("CashOnDeliveryStep"));
			}
		},

		checkBillingStep: function () {
			var address = this.model.getProperty("/BillingAddress/Address") || "";
			var city = this.model.getProperty("/BillingAddress/City") || "";
			var zipCode = this.model.getProperty("/BillingAddress/ZipCode") || "";
			var country = this.model.getProperty("/BillingAddress/Country") || "";

			if (address.length < 3 || city.length < 3 || zipCode.length < 3 || country.length < 3) {
				this._wizard.invalidateStep(this.byId("BillingStep"));
			} else {
				this._wizard.validateStep(this.byId("BillingStep"));
			}
		},

		completedHandler: function () {
			this._oNavContainer.to(this._oWizardReviewPage);
		},

		_handleMessageBoxOpen: function (sMessage, sMessageBoxType) {
			MessageBox[sMessageBoxType](sMessage, {
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {
						this._wizard.discardProgress(this._wizard.getSteps()[0]);
						this.handleNavBackToList();
					}
				}.bind(this)
			});
		},

		handleNavBackToList: function () {
			this._navBackToStep(this.byId("ContentsStep"));
		},

		handleNavBackToPaymentType: function () {
			this._navBackToStep(this.byId("PaymentTypeStep"));
		},

		handleNavBackToCreditCard: function () {
			this._navBackToStep(this.byId("CreditCardStep"));
		},

		handleNavBackToCashOnDelivery: function () {
			this._navBackToStep(this.byId("CashOnDeliveryStep"));
		},

		handleNavBackToBillingAddress: function () {
			this._navBackToStep(this.byId("BillingStep"));
		},

		handleNavBackToDeliveryType: function () {
			this._navBackToStep(this.byId("DeliveryTypeStep"));
		},

		_navBackToStep: function (step) {
			var fnAfterNavigate = function () {
				this._wizard.goToStep(step);
				this._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}.bind(this);

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			this._oNavContainer.to(this._oDynamicPage);
		},

		_bindKeys: function () {
			// Mousetrap.bind("mod+s", function (e) { return false; }.bind(this));
			var wiz = this.getView().byId("ShoppingCartWizard");
			Mousetrap.bind({
					'mod+s': function(e){
						MessageToast.show("You have overriden the browser Ctrl + S action",{ at: "center center" });
						return false;
					}.bind(this),
					'a': function (e) {
						MessageToast.show("You pressed the A key",{ at: "center center" });
					}.bind(this),
					'del 1': function (e) {
						this._deleteRow(e.key);
					}.bind(this),
					'del 2': function (e) {
						this._deleteRow(e.key);
					}.bind(this),
					'del 3': function (e) {
						this._deleteRow(e.key);
					}.bind(this),
					'del 4': function (e) {
						this._deleteRow(e.key);
					}.bind(this),
					'del 5': function (e) {
						this._deleteRow(e.key);
					}.bind(this),
					'2': function (e) {
						MessageToast.show("You have chosen to go to step 2",{ at: "center center" });	
						wiz.nextStep();
					}.bind(this),
					'c r': function (e) {
						MessageToast.show("You have chosen credit card",{ at: "center center" });	
						this.setPaymentMethod();
					}.bind(this),
					'b': function (e) {
						MessageToast.show("You have chosen bank account",{ at: "center center" });	
						this.setPaymentMethod();
					}.bind(this),
					'c a': function (e) {
						MessageToast.show("You have chosen cash only",{ at: "center center" });	
						this.setPaymentMethod();
					}.bind(this)						
					
				}

			);
		},

		_deleteRow: function (i) {
			var l = this.model.getData().ProductCollection.length;
			var row = parseInt(i, 10);
			if ( row.toString() === i && l >= 0 && l >= row ) {
				MessageToast.show("You have chosen to delete entry: " + i,{ at: "center center" });
				this.model.getData().ProductCollection.splice(row - 1, 1);
				this.calcTotal();
				this.model.updateBindings();
			}
		},

		onMousetrap: function (oEvent) {
			var oToggle = this.getView().byId("btnToggleKeys");
			var isPressed = oEvent.getSource().getPressed();
			if (isPressed) {
				Mousetrap.pause();
				oToggle.setText("Turn keyboard shortcuts on");
			} else {
				oToggle.setText("Turn keyboard shortcuts off");
				Mousetrap.unpause();
			}
		}
	});
});