const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const ExtensionSystem = imports.ui.extensionSystem;
const Window = Extension.imports.window.Window;
const Workspace = Extension.imports.workspace.Workspace;
const DefaultTilingStrategy = Extension.imports.tiling.DefaultTilingStrategy;
const OverviewModifier = Extension.imports.tiling.OverviewModifier;
const Log = Extension.imports.logger.Logger.getLogger("ShellTile");
const Convenience = Extension.imports.convenience;


const Ext = function Ext(){
	let self = this;
	let OVERRIDE_SCHEMA = "org.gnome.shell.overrides";
	
    self.log = Log.getLogger("Ext");
    
    self.gnome_settings = Convenience.getSettings(OVERRIDE_SCHEMA);	
    self.settings = Convenience.getSettings();
    
    self.enabled = false;
	
    self.workspaces = {};
	self.windows = {};
	self.strategy = new DefaultTilingStrategy(self);
	
	self.connect_and_track = function(owner, subject, name, cb) {
		if (!owner.hasOwnProperty('_bound_signals')) {
			owner._bound_signals = [];
		}
		owner._bound_signals.push([subject, name, subject.connect(name, cb)]);
	};
	
	self.get_topmost_groups = function(){

		let groups = {};
		
		for(let id in self.windows){
			let window = self.windows[id];
			if(window.group){
				
				let group = window.group.get_topmost_group();
								
				if(group){
					
					let group_id = group.id();
					if(!groups[group_id]){
						groups[group_id] = group;
					}
					
				}
				
			}
		}
		
		return groups;
		
	}
	
	self.maximize_grouped_windows = function(){
		if(!self.enabled) return;
		
		let groups = self.get_topmost_groups();
		
		for(let group_id in groups){
			let group = groups[group_id];
			group.maximize_size();
			group.save_bounds();
		}
		
		if(this.log.is_debug()) this.log.debug("maximize_grouped_windows");
	}
	
	self.resize_grouped_windows = function(){
		if(!self.enabled) return;

		let groups = self.get_topmost_groups();
		
		for(let group_id in groups){
			let group = groups[group_id];
			group.reposition();
		}
		
		if(this.log.is_debug()) this.log.debug("resize_grouped_windows");		
		
	}
	
	self.load_settings = function(){
		
		let last_keep_maximized = self.keep_maximized;
		self.keep_maximized = self.settings.get_boolean("keep-group-maximized");
		
		let gap = self.settings.get_int("gap-between-windows");
		if(this.log.is_debug()) this.log.debug("gap: " + gap + " " + self.strategy.DIVISION_SIZE);
		
		if(self.gap_between_windows === undefined || gap != self.gap_between_windows){
			self.gap_between_windows = gap;
			self.resize_grouped_windows();
		}
		
		
		if(self.keep_maximized && last_keep_maximized === false){
			self.maximize_grouped_windows();			
		}
		
	};
	self.load_settings();
	
	self.current_display = function current_display() {
		return global.screen.get_display();
	};

	self.current_window = function current_window() {
		return self.get_window(self.current_display()['focus-window']);
	};
	
	self.get_workspace = function get_workspace(meta_workspace) {
		let workspace = self.workspaces[meta_workspace];
		
    	if(typeof(workspace) == "undefined") {
			workspace = self.workspaces[meta_workspace] = new Workspace(meta_workspace, self, self.strategy);
		}
		return workspace;
	};
	
	self.on_remove_workspace = function(screen, index) {
		Mainloop.idle_add(Lang.bind(this, function () {
		   
		    var removed_meta = null;
		    var removed_ws = null;
		    for(let k in self.workspaces){
			    let v = self.workspaces[k];
			    var found = false;
			    for(let i=0; i<screen.get_n_workspaces();i++){
				    var meta_workspace = screen.get_workspace_by_index(i);
				    if(meta_workspace.toString() == k) found = true;
			    }

			    if(!found){
				    removed_meta = k;
				    removed_ws = v;
				    break;
			    }
		    }
		
		    if(removed_meta != null) {
			    self.remove_workspace(removed_meta);
		    }
			return false;
		
        }));


	};
	
	self.remove_workspace = function(removed_meta) {	
		if(removed_meta != null && self.workspaces[removed_meta]) {
			self.workspaces[removed_meta]._disable();
			delete self.workspaces[removed_meta];
		}
	};
	
	self.remove_window = function(removed_meta){
		if(removed_meta){
			var id = Window.get_id(removed_meta);
			delete self.windows[id];
		}
	};
	
	self.get_window = function get_window(meta_window, create_if_necessary) {
		if(typeof(create_if_necessary) == 'undefined') {
			create_if_necessary = true;
		}
		if(!meta_window) {
			return null;
		}
		var id = Window.get_id(meta_window);
		if(this.log.is_debug()) this.log.debug("get_window " + id);
		var win = self.windows[id];
		if(typeof(win) == "undefined" && create_if_necessary) {
			win = self.windows[id] = new Window(meta_window, self);
		}
		return win;
	};
	
	
	self._init_workspaces = function() {

		function _init_workspace (i) {
			self.get_workspace(self.screen.get_workspace_by_index(i));
		};

		self.connect_and_track(self, self.screen, 'workspace-added', function(screen, i) { _init_workspace(i); });
		self.connect_and_track(self, self.screen, 'workspace-removed', self.on_remove_workspace);

		for (var i = 0; i < self.screen.n_workspaces; i++) {
			_init_workspace(i);
		}

	};

	self._disconnect_workspaces = function() {
		for (var k in self.workspaces) {
			if (self.workspaces.hasOwnProperty(k)) {
				self.remove_workspace(k);
			}
		}
	};

	self.disconnect_tracked_signals = function(owner, object) {
		if(owner._bound_signals == null) return;
		
		var bound_signals1 = [];
		for(var i=0; i<owner._bound_signals.length; i++) {
			var sig = owner._bound_signals[i];
			if(object === undefined || sig[0] === object){
				sig[0].disconnect(sig[2]);
			} else {
				bound_signals1.push(sig);
			}
		}
		owner._bound_signals = bound_signals1;
	};

	self.enable = function(){
	    try {
	    	if(self.log.is_debug()) self.log.debug("enabling ShellTile");
	
            self.enabled = true;
            self.screen = global.screen;
            let screen = self.screen;
            
            self._init_workspaces();
            
            var edge_tiling = self.gnome_settings.get_boolean("edge-tiling");
            if(edge_tiling === true){
            	self.gnome_settings.set_boolean("edge-tiling", false);
            }

            self.connect_and_track(self, self.gnome_settings, 'changed', Lang.bind(this, this.on_settings_changed));
            self.connect_and_track(self, self.settings, 'changed', Lang.bind(this, this.on_settings_changed));

            OverviewModifier.register(self);
            
            if(self.log.is_debug()) self.log.debug("ShellTile enabled");
        
	    } catch(e){
            if(self.log.is_error()) self.log.error(e);    
        }
	}
	
	self.on_settings_changed = function(){
		
		var edge_tiling = self.gnome_settings.get_boolean("edge-tiling");
		if(edge_tiling && self.enabled){
			self.gnome_settings.set_boolean("edge-tiling", false);
		}
		
		self.load_settings();
	}

	self.disable = function(){
        try {        
            self.enabled = false;
            self.gnome_settings.set_boolean("edge-tiling", true);
            
		    self.disconnect_tracked_signals(self);
		    
            if(self.log.is_debug()) self.log.debug("ShellTile disabled");

        } catch(e){
        	if(self.log.is_error()) self.log.error(e);    
        }
	}
};

function init() {
    let ext = new Ext();
	return ext
}

function main(){
	init().enable();
}
