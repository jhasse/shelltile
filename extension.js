const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const Ext = function Ext(){
	let self = this;
	self.enabled = false;
	
	self.enable = function(){
        self.enabled = true;
        self.screen = global.screen;
        global.log("enableeeee");
	}

	self.disable = function(){
        self.enabled = false;
        global.log("disableeee");
	}
};

function init() {
    let ext = new Ext();
	return ext
}

function main(){
	init().enable();
}
