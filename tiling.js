const Meta = imports.gi.Meta;
const St = imports.gi.St;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Log = Extension.imports.logger.Logger.getLogger("ShellTile");
const Window = Extension.imports.window.Window;
const GSWorkspace = imports.ui.workspace.Workspace;

const WindowGroup = function(first, second, type, splitPercent){
	
	if(!splitPercent) splitPercent = 0.5;
	
	this.first = first;
	this.second = second;
	this.type = type
	this.splitPercent = splitPercent;
	this.log = Log.getLogger("WindowGroup");
	
	this.gap_between_windows = function(){
		let ret = this.extension.gap_between_windows;
		if(ret === undefined) ret = 10;
		return ret;
	}
	
	this.toString = function(){
		return "WindowGroup(first=" + this.first + ",second="+ this.second + ",type=" + this.type + ")";
	}
	
	this.id = function(){
		return "(" + this.first.id() + "," + this.second.id() + ")";		
	}
	
	this.get_maximized_bounds = function(){
		return this.first.get_maximized_bounds();
	}
	
	this.get_workspace = function(){
		return this.first.get_workspace();
	}
	
	this.maximize_size = function(){
		var bounds = this.get_maximized_bounds();
		this.move_resize(bounds.x, bounds.y, bounds.width, bounds.height);
	}
	
	this.save_bounds = function(){
		this.save_position();
		this.save_size();
	}
	
	this.save_position = function(){
		this.saved_position = this.outer_rect();
		this.first.save_position();
		this.second.save_position();
	}
	
	this.save_size = function(){
		this.saved_size = this.outer_rect();
		this.first.save_size();
		this.second.save_size();		
	}
	
	this.outer_rect = function(){
		var first_rect = this.first.outer_rect();
		var second_rect = this.second.outer_rect();
		var xleft = first_rect.x < second_rect.x ? first_rect.x : second_rect.x;
		var yleft = first_rect.y < second_rect.y ? first_rect.y : second_rect.y;
		
		if((first_rect.x + first_rect.width) > (second_rect.x + second_rect.width)){
			var xright = first_rect.x + first_rect.width;
		} else {
			var xright = second_rect.x + second_rect.width;
		}
		
		if((first_rect.y + first_rect.height) > (second_rect.y + second_rect.height)){
			var yright = first_rect.y + first_rect.height;
		} else {
			var yright = second_rect.y + second_rect.height;
		}
		
		var x = xleft;
		var y = yleft;
		var width = xright - xleft;
		var height = yright - yleft;
		
		/*var maximized_bounds = this.get_maximized_bounds();
		if(x < maximized_bounds.x) x = maximized_bounds.x;
		if(y < maximized_bounds.y) y = maximized_bounds.y;
		if(width > maximized_bounds.width) width = maximized_bounds.width;
		if(height > maximized_bounds.width) height = maximized_bounds.height;*/
		
		return new Meta.Rectangle({ x: x, y: y, width: width, height: height});
	}
	
	this.width = function() { return this.outer_rect().width; }
	this.height = function() { return this.outer_rect().height; }	
	
	this.update_split_percent = function(bounds, changed){
		
		if(this.log.is_debug()) this.log.debug("update_split_percent: " + [bounds.x, bounds.y, bounds.width, bounds.height]);		

		var first_rect = this.first.outer_rect();
		var second_rect = this.second.outer_rect();
		var splitPercent = this.splitPercent;
		
		if(changed === this.first){
			
			if(this.type == WindowGroup.HORIZONTAL_GROUP){
				if(this.log.is_debug()) this.log.debug("horizontal split changed");
				splitPercent = first_rect.width / bounds.width;
				
			} else if(this.type == WindowGroup.VERTICAL_GROUP){
				if(this.log.is_debug()) this.log.debug("vertical split changed");
				splitPercent = first_rect.height / bounds.height;
			}
			this.splitPercent = splitPercent;

		} else if(changed === this.second){
			
			if(this.type == WindowGroup.HORIZONTAL_GROUP){
				if(this.log.is_debug()) this.log.debug("horizontal split changed");
				splitPercent = 1 - ((second_rect.width + this.gap_between_windows()) / bounds.width);
				
			} else if(this.type == WindowGroup.VERTICAL_GROUP ){
				if(this.log.is_debug()) this.log.debug("vertical split changed");
				splitPercent = 1 - ((second_rect.height + this.gap_between_windows()) / bounds.height);
			}
			this.splitPercent = splitPercent;
			
		}
		
	}
	
	this.update_geometry = function(win){
		
		if(win){
			
			var first_rect = this.first.outer_rect();
			var second_rect = this.second.outer_rect();
			var win_rect = win === this.first ? first_rect : second_rect;
			
			if(this.type == WindowGroup.HORIZONTAL_GROUP){

				var diff = (first_rect.x + first_rect.width + this.gap_between_windows()) - second_rect.x;
				
				if(win === this.first){
					
					second_rect.x += diff;
					second_rect.width -= diff;
					
				} else if(win === this.second){
					
					first_rect.width -= diff;

				}
				
			} else if(this.type == WindowGroup.VERTICAL_GROUP){
				
				var diff = (first_rect.y + first_rect.height + this.gap_between_windows()) - second_rect.y;
			
				if(win === this.first){
					
					second_rect.y += diff;
					second_rect.height -= diff;
					
				} else if(win === this.second){
					first_rect.height -= diff;
				}
			}
			
			this.first.move_resize(first_rect.x, first_rect.y, first_rect.width, first_rect.height);
			this.second.move_resize(second_rect.x, second_rect.y, second_rect.width, second_rect.height);
			
			var bounds = this.outer_rect();
			
			if(this.type == WindowGroup.HORIZONTAL_GROUP){
				bounds.height = win_rect.height;
				bounds.y = win_rect.y;
			} else if(this.type == WindowGroup.VERTICAL_GROUP){
				bounds.width = win_rect.width;
				bounds.x = win_rect.x;
			}
			
			
			this.update_split_percent(bounds, win);
			
			this.move_resize(bounds.x, bounds.y, bounds.width, bounds.height);
		
		}
		if(this.group) this.group.update_geometry(this);
		else {
			
			var saved_position = this.saved_position;
			var saved_size = this.saved_size;
			var bounds = this.outer_rect();
			
			if(saved_position){
				bounds.x = saved_position.x;
				bounds.y = saved_position.y;
			}
			
			if(saved_size){
				bounds.width = saved_size.width;
				bounds.height = saved_size.height;
			}			

			this.move_resize(bounds.x, bounds.y, bounds.width, bounds.height);
		}
	}
	
	this.move_resize = function(x, y, width, height){
		if(x===undefined || y===undefined || width===undefined || height===undefined){
			return;
		}
		
		let first_width = width;
		let second_width = width;
		let first_height = height;
		let second_height = height;
		let first_x = x;
		let second_x = x;
		let first_y = y;
		let second_y = y;		
		
		if(this.log.is_debug()) this.log.debug(this);
		
		if(this.type == WindowGroup.HORIZONTAL_GROUP){
			first_width = Math.round(width * this.splitPercent);
			second_width = width - first_width - this.gap_between_windows();
			second_x = first_x + first_width + this.gap_between_windows();
			
		} else if(this.type == WindowGroup.VERTICAL_GROUP){
			first_height = Math.round(height * this.splitPercent);
			second_height = height - first_height - this.gap_between_windows();
			second_y = first_y + first_height + this.gap_between_windows();
		}
		
		if(this.log.is_debug()) this.log.debug("first: " + [first_x, first_y, first_width, first_height])
		this.first.move_resize(first_x, first_y, first_width, first_height);
		var first_rect = this.first.outer_rect();

		if(first_rect.width > first_width || first_rect.height > first_height){

			if(this.type == WindowGroup.HORIZONTAL_GROUP){
				if(first_rect.height > first_height){
					second_height = first_rect.height;
				}
				if(first_rect.width > first_width){
					var diff_w = first_rect.width - first_width;
					second_x += diff_w;
					second_width -= diff_w;		
				}
			} else if(this.type == WindowGroup.VERTICAL_GROUP){
				if(first_rect.width > first_width){
					second_width = first_rect.width;
				}
				if(first_rect.height > first_height){
					var diff_h = first_rect.height - first_height;
					second_y += diff_h;
					second_height -= diff_h;	
				}
			}
		}
		
		if(this.log.is_debug()) this.log.debug("second: " + [second_x, second_y, second_width, second_height])
		this.second.move_resize(second_x, second_y, second_width, second_height);
		var second_rect = this.second.outer_rect();

		if(second_rect.width > second_width || second_rect.height > second_height){

			if(this.type == WindowGroup.HORIZONTAL_GROUP){
				if(second_rect.height > second_height){
					first_height = second_rect.height;
				}
				if(second_rect.width > second_width){
					var diff_w = second_rect.width - second_width;
					first_width -= diff_w;
					second_x -= diff_w;
				}
			} else if(this.type == WindowGroup.VERTICAL_GROUP){
				if(second_rect.width > second_width){
					first_width = second_rect.width;
				}
				if(second_rect.height > second_height){
					var diff_h = second_rect.height - second_height;
					first_height -= diff_h;
					second_y -= diff_h;
				}
			}			

			if(this.log.is_debug()) this.log.debug("first1: " + [first_x, first_y, first_width, first_height])
			this.first.move_resize(first_x, first_y, first_width, first_height);
			if(this.log.is_debug()) this.log.debug("second1: " + [second_x, second_y, second_width, second_height])
			this.second.move_resize(second_x, second_y, second_width, second_height);
		}
	}
	
	this.move_to_workspace = function(workspace, descending){
		if(!descending && this.group){
			this.group.move_to_workspace(workspace);
		}
		
		if(this.first.meta_window && this.first.get_workspace() !== workspace){
			this.first.move_to_workspace(workspace);
		} else {
			this.first.move_to_workspace(workspace, true);
		}
		
		if(this.second.meta_window && this.second.get_workspace() !== workspace){
			this.second.move_to_workspace(workspace);
		} else {
			this.second.move_to_workspace(workspace, true);
		}
	}
	
	this.raise = function(ascending){
		if(this.group && ascending){
			this.group.raise(true);
		} else {
			this.first.raise();
			this.second.raise();
		}
	}
	
	this.get_windows = function(){
		var ret = [];
		if(this.first.get_windows){
			ret.concat(this.first.get_windows());
		} else ret.push(this.first.id());
		
		if(this.second.get_windows){
			ret.concat(this.second.get_windows());
		} else ret.push(this.second.id());
		
		return ret;
	}
	
	this.minimize = function(ascending){
		if(this.group && ascending){
			this.group.minimize(true);
		} else {	
			this.first.minimize();
			this.second.minimize();
		}
	}
	
	this.reposition = function(){
		
		var group = this.get_topmost_group();
		
		var existing_size = group.outer_rect();

		group.move_resize(existing_size.x, existing_size.y, existing_size.width, existing_size.height);
		
	}
	
	this.attach = function(win){
		
		if(this.first.group){
			var withGroup = this.first;
		} else {
			var withGroup = this.second;
		}
		
		if(!this.extension.keep_maximized){
			var existing = this.first === win ? this.second : this.first;
			if(existing.group) existing = existing.group.get_topmost_group();
			var existing_size = existing.outer_rect();
		}
		
		var prevGroup = withGroup.group;
		if(prevGroup){
			if(prevGroup.first === withGroup){
				prevGroup.first = this;
			} else {
				prevGroup.second = this;
			}
			this.group = prevGroup;
		}

		this.first.group = this;
		this.second.group = this;


		var group = this.get_topmost_group();
		
		if(this.extension.keep_maximized){
		
			group.maximize_size();
		
		} else {

			group.move_resize(existing_size.x, existing_size.y, existing_size.width, existing_size.height);

		}
				
		group.save_bounds();
		group.raise();
		

	}
	
	this.get_topmost_group = function(){
		var group = this;
		while(group.group){ 
			group = group.group; 
		}
		return group;
	}
	
	this.detach = function(win, noop){
		
		if(this.group){
			
			if(this.group.first === this){
				if(this.first === win){
					this.group.first = this.second;
					this.second.group = this.group;
				} else {
					this.group.first = this.first;
					this.first.group = this.group;
				}
			} else if(this.group.second === this){
				if(this.first === win){
					this.group.second = this.second;
					this.second.group = this.group;
				} else {
					this.group.second = this.first;
					this.first.group = this.group;
				}
			}
			
			delete win.group;
			if(!noop){
				var group = this.get_topmost_group();
				group.update_geometry();
			}
			delete this.group;

		} else {
			
			delete this.first.group;
			delete this.second.group;

			if(!noop && this.extension.keep_maximized){
				var maxi = this.first;
				if(win === this.first) maxi = this.second;
				
				maxi.maximize_size();
				maxi.save_bounds();
			}
		}
		
		delete this.first;
		delete this.second;
	}
	
	this.preview_rect = function(win){
		var preview = [[0,0,1,0.5], [0.5,0,0.5,1], [0,0.5,1,0.5], [0,0,0.5,1]]
		
		if(win === this.first){
			var corner = this.type == WindowGroup.VERTICAL_GROUP ? 0 : 3;
			var win_rect = this.second.outer_rect();
			
		} else if(win === this.second){
			var corner = this.type == WindowGroup.VERTICAL_GROUP ? 2 : 1;
			var win_rect = this.first.outer_rect();
		}
		
		var currentpreview = preview[corner];
		
		var preview_x = win_rect.x + currentpreview[0] * win_rect.width;
		var preview_y = win_rect.y + currentpreview[1] * win_rect.height;
		var preview_width = currentpreview[2] * win_rect.width;
		var preview_height = currentpreview[3] * win_rect.height;
		
		return new Meta.Rectangle({ x: preview_x, y: preview_y, width: preview_width, height: preview_height});
	}
}
WindowGroup.HORIZONTAL_GROUP = "horizontal";
WindowGroup.VERTICAL_GROUP = "vertical";



const DefaultTilingStrategy = function(ext){
	
	this.extension = ext;
	this.log = Log.getLogger("DefaultTilingStrategy");
	this.lastTime = null;
	this.lastTimeCtrlPressed = null;
	
	this.preview = new St.BoxLayout({style_class: 'grid-preview'});
	this.preview.add_style_pseudo_class('activate');
	this.preview_for_edge_tiling = false;
	this.preview.visible = false;
	Main.uiGroup.add_actor(this.preview);
	
	this.is_ctrl_pressed = function(){
		let [x, y, mods] = global.get_pointer();
		var ret = mods & Clutter.ModifierType.CONTROL_MASK;
		if(ret){
			this.lastTimeCtrlPressed = new Date().getTime();
		} else {
			var currTime = new Date().getTime();
			if(this.lastTimeCtrlPressed && (currTime - this.lastTimeCtrlPressed) < 500){
				ret = true;
			}
		}
		return ret;
	}
	
	this.on_window_move = function(win){
		win.unmaximize();
		win.raise();

		var currTime = new Date().getTime();
		if(!win.group && (!this.lastTime || (currTime - this.lastTime) > 200)){ 
			this.lastTime = currTime;
			
			var preview_rect = null;
			var is_ctrl_pressed = this.is_ctrl_pressed();
			if(win && is_ctrl_pressed){
				
				var window_under = this.get_window_under(win);
				if(window_under){
					
					var groupPreview = this.get_window_group_preview(window_under, win);
					if(groupPreview){
						var preview_rect = groupPreview.preview_rect(win);
						groupPreview.first = null;
						groupPreview.second = null;
						if(this.log.is_debug()) this.log.debug("preview_rect: " + preview_rect);
					}
					
				}

			}
			
			var for_edge_tiling = !preview_rect;
			if(for_edge_tiling){
				
				var preview_rect = this.get_edge_preview(win);
			}
			
			this.preview_for_edge_tiling = for_edge_tiling;
			this.update_preview(preview_rect);
		}
	}
	
	this.on_window_moved = function(win){

		if(win.group){
			win.update_geometry(true, false);
			win.raise();
		} else {
			
			var is_ctrl_pressed = this.is_ctrl_pressed();
			var window_under = null;
			var group_preview = null;
			
			if(is_ctrl_pressed || (!this.preview_for_edge_tiling && this.preview.visible)){
				
				var window_under = this.get_window_under(win);
				if(window_under){
					
					var group_preview = this.get_window_group_preview(window_under, win);

				}
			
			}
			
			if(group_preview){
				
				if(win.group) win.group.detach(win);
				group_preview.attach(win);
				
			} else {
				
				if(this.top_edge()){
					
					win.maximize();
					
				} else {
					var preview_rect = this.get_edge_preview(win);
					if(preview_rect){
						win.move_resize(preview_rect.x, preview_rect.y, preview_rect.width, preview_rect.height);			
					}
				}				
				
			}
		}
		this.update_preview(null);

	}
	
	this.update_preview = function(preview_rect){
		
		
		
		if(preview_rect){
			
			if(!this.last_preview_rect || !this.last_preview_rect.equal(preview_rect)){
				
				this.preview.visible = true;
				
				Tweener.removeTweens(this.preview);
	            Tweener.addTween(this.preview,
	                    { 
	                      time: 0.125,
	                      opacity: 255,
	                      visible: true,
	                      transition: 'easeOutQuad',
	                      x: preview_rect.x,
	            		  y: preview_rect.y,
	            		  width: preview_rect.width,
	            		  height: preview_rect.height
	                    });
			
				/*this.preview.x = preview_rect.x;
				this.preview.y = preview_rect.y;
				this.preview.width = preview_rect.width;
				this.preview.height = preview_rect.height;*/
			} else {
				
				if(this.log.is_debug()) this.log.debug("same rect");
				
			}
			
		} else {
			Tweener.removeTweens(this.preview);
			this.preview.visible = false;
		}
		this.last_preview_rect = preview_rect;
	}
	
	this.on_window_resize = function(win){
		win.raise();
	}
	
	this.on_window_resized = function(win){
		win.update_geometry(false, true);
		this.on_window_resize(win);
	}
	
	this.on_window_maximize = function(win){
		if(win.group){
			win.group.detach(win);
			if(this.extension.keep_maximized) win.maximize_size();
			win.raise();
		}
	}
	
	this.on_window_remove = function(win){
		if(!win.get_workspace()){
			if(this.log.is_debug()) this.log.debug("detach window");
			if(win.group){
				win.group.detach(win);			
			}
		}	
	}
	
	this.on_window_minimize = function(win){
		if(win.group){
			win.group.minimize(true);			
		}
	}
	
	this.on_window_raised = function(win){
		if(win.group){
			win.group.raise(true);
			win.raise();
		}
	}
	
	this.get_window_group_preview = function(below, above){
		
		var log = this.log;	
		
		let TOP_LEFT = 0;
		let TOP_RIGHT = 1;
		let BOTTOM_RIGHT = 2;
		let BOTTOM_LEFT = 3;
		
		var current = below;
		var corners = [[],[],[],[]];
		corners[TOP_LEFT].push(current);
		corners[TOP_RIGHT].push(current);
		corners[BOTTOM_RIGHT].push(current);
		corners[BOTTOM_LEFT].push(current);
		
		var delta = [[0,1,0,-1], [0,0,-1,0], [0,0,0,-1], [1,0,-1,0]];
		var start = [[0,0], [0.5, 0], [0.5, 0.5], [0, 0.5]];
		var groups = [["above", "below", "v"], ["below", "above", "h"], ["below", "above", "v"], ["above", "below", "h"]];
		
		while(current.group){
			var parent = current.group;
			if(parent.type == WindowGroup.HORIZONTAL_GROUP){
				corners[TOP_LEFT].push(parent);
				corners[BOTTOM_RIGHT].push(parent);
			} else if(parent.type == WindowGroup.VERTICAL_GROUP){
				corners[TOP_RIGHT].push(parent);
				corners[BOTTOM_LEFT].push(parent);
			}
			current = parent;
		}
		
		var calculate_corners = function(below_rect, currentcorner, currentdelta, currentstart, corner){
						
			var current_x = below_rect.x + below_rect.width * currentstart[0];
			var current_y = below_rect.y + below_rect.height * currentstart[1];
			var current_width = below_rect.width / 2;
			var current_height = below_rect.height / 2;
			
			var delta_w = current_width / currentcorner.length;
			var delta_h = current_height / currentcorner.length;			

			var ret = [];
			for(var i=0; i<currentcorner.length; i++){
				var win = currentcorner[i];
				
				var corner_x = current_x;
				var corner_y = current_y;
				var corner_width = current_width;
				var corner_height =	current_height;				
				
				var corner_rect = new Meta.Rectangle({ x: corner_x, y: corner_y, width: corner_width, height: corner_height});
				ret.splice(0,0,[corner_rect, win, corner]);
				
				current_x += currentdelta[0] * delta_w;
				current_y += currentdelta[1] * delta_h;
				current_width += currentdelta[2] * delta_w;
				current_height += currentdelta[3] * delta_h;				
			}			
			return ret;
		}		
		
		var below_rect = below.outer_rect();
		
		var corner_rects = [];
		for(var i=0; i<4; i++){
			var currentcorner = corners[i];
			var currentdelta = delta[i];
			var currentstart = start[i];
			corner_rects[i] = calculate_corners(below_rect, currentcorner, currentdelta, currentstart, i);
		}
		
		var cursor_rect = this.get_cursor_rect();

		var get_current_cursor_rect = function(){
			
			for(var i=0; i<corner_rects.length; i++){
				
				var current_corner_rects = corner_rects[i];
				for(var j=0; j<current_corner_rects.length; j++){
					var current_corner_rect = current_corner_rects[j];
					if(current_corner_rect[0].contains_rect(cursor_rect)){
						return current_corner_rect;
					}
				}
			}
			return null;
		}

		var current_cursor_rect = get_current_cursor_rect();
		if(!current_cursor_rect) return null;
		else {
			var win = current_cursor_rect[1];
			var group = groups[current_cursor_rect[2]];
			
			var vars = {"above": above, "below": win, "h": WindowGroup.HORIZONTAL_GROUP, "v": WindowGroup.VERTICAL_GROUP};
			
			var ret = new WindowGroup(vars[group[0]], vars[group[1]], vars[group[2]]);
			ret.extension = this.extension;
			return ret;
		}
	}
	
	this.get_main_panel_rect = function(){
		
		return new Meta.Rectangle({ x: 0, y: 0, width: Main.panel.actor.width, height: Main.panel.actor.height});
		
	}
	
	this.get_cursor_rect = function(){
		let [mouseX, mouseY] = global.get_pointer();
		return new Meta.Rectangle({ x: mouseX, y: mouseY, width: 1, height: 1});
	}
	
	this.get_window_under = function(win){
		var workspace = win.get_workspace();
		var workspace_windows = workspace.meta_windows();
		
		var cursor_rect = this.get_cursor_rect();

		var topmost = undefined;
		var current_group = undefined;
		var current_windows = undefined;
		
		for(let i=workspace_windows.length-1; i>=0; i--){
			let win1 =  workspace_windows[i];
			
			win1 = this.extension.get_window(win1, true);
			if(this.log.is_debug()) this.log.debug("window_under: " + win1);
			if(win1.can_be_tiled() && !win1.is_minimized() && win1.meta_window !== win.meta_window){

				if(win1.outer_rect().contains_rect(cursor_rect)){
					
					topmost = win1;
					break;
				} else {
					if(!current_group && win1.group){
						
						current_group = win1.group.get_topmost_group();
						current_windows = current_group.get_windows();
						var idx = current_windows.indexOf(win.id());
						if(idx>=0) current_windows.splice(idx,1);
					
					}
					if(current_windows){
						var idx = current_windows.indexOf(win1.id());
						if(idx>=0) current_windows.splice(idx,1);
						
						if(this.log.is_debug()) this.log.debug("current_windows: " + current_windows);
						if(current_windows.length == 0){
							if(current_group.outer_rect().contains_rect(cursor_rect)){
								break
							}
							current_group = undefined;
							current_windows = undefined;
						}
					}
				}
				
			}			
		}
		return topmost;
	}
	
	this.top_edge = function(){
		 
		var main_panel_rect = this.get_main_panel_rect();
		var cursor_rect = this.get_cursor_rect();
		return main_panel_rect.contains_rect(cursor_rect)
		
	}
	
	this.get_edge_preview = function(win){
		var main_panel_rect = this.get_main_panel_rect();
		var cursor_rect = this.get_cursor_rect();
		var maxi = win.get_maximized_bounds();
		var ret = null;
		var edge_zone_width = DefaultTilingStrategy.EDGE_ZONE_WIDTH;
		
		if(main_panel_rect.contains_rect(cursor_rect)){
		
			ret = maxi;
		
		} else if(cursor_rect.x >=0 && cursor_rect.x < edge_zone_width){
			
			maxi.width = maxi.width / 2;
			ret = maxi;
			
		} else if(cursor_rect.x > (maxi.x + maxi.width - edge_zone_width) && cursor_rect.x <= (maxi.x + maxi.width)){
				
			maxi.width = maxi.width / 2;
			maxi.x += maxi.width;
			ret = maxi;
			
		}
		return ret;			
		
	}
	
};

DefaultTilingStrategy.EDGE_ZONE_WIDTH = 20;


const OverviewModifier = function(gsWorkspace, extension){
	
	this.gsWorkspace = gsWorkspace;
	this.extension = extension;
	this.log = Log.getLogger("OverviewModifier");
	
	this.computeNumWindowSlots = function(){
		let clones = this.gsWorkspace._windows.slice();
		
		let groupOrder = [];
		let groupGeometry = {};
		let groupedSlots = [];
		let singleSlots = [];
		let cloneGroup = {};
		let clones1 = [];
		
		for(var i=0; i<clones.length; i++){
			var clone = clones[i];
			var clone_meta_window = clone.metaWindow;
			
			var myWindow = this.extension.get_window(clone_meta_window);
			var windowId = myWindow.id();
			if(this.log.is_debug()) this.log.debug(myWindow);
			clones1.push(windowId);

			if(myWindow.group){
				var topmost_group = myWindow.group.get_topmost_group();
				var topmost_group_id = topmost_group.id();
				if(groupOrder.indexOf(topmost_group_id) < 0){
										
					groupOrder.push(topmost_group_id);

					groupedSlots.push(topmost_group_id);

					groupGeometry[topmost_group_id] = topmost_group.outer_rect();
					
				}
				cloneGroup[windowId] = topmost_group_id;
				
			} else {
				
				groupOrder.push(windowId);
				groupGeometry[windowId] = myWindow.outer_rect();
				singleSlots.push(windowId);
				cloneGroup[windowId] = windowId;
			}
		}
		
		this.groupOrder = groupOrder;
		this.groupGeometry = groupGeometry;
		this.groupedSlots = groupedSlots;
		this.singleSlots = singleSlots;
		this.cloneGroup = cloneGroup;
		this.clones = clones1;
		this.groupWindowLayouts = {}
		
		return groupOrder.length;
	}
	
	this._prevComputeWindowLayout = function(prevComputeWindowLayout, outer_rect, workspace, slot){
		
		
		var fakeWindow = {
				
				get_outer_rect: function(){return outer_rect;}
				
				,get_workspace: function(){
					return workspace;
				}
		}
		return prevComputeWindowLayout(fakeWindow, slot);
		
	}
	
	this.computeWindowSlots = function(numSlots, prev, prevComputeWindowLayout){
		
		let groupSlot = {};
		
		if(numSlots < 3){
		
			let basicWindowSlots = prev(numSlots);
			
			for(var i=0; i<this.groupOrder.length; i++){
				
				var group = this.groupOrder[i];
				var slot = basicWindowSlots[i];
				groupSlot[group] = slot;
			
			}			
		
		} else {
			
			let singleWeight = 1.;
			let groupedWeight = 1.5;
			let numberOfWindows = this.groupedSlots.length + this.singleSlots.length;
			let slots = [];
			if(this.log.is_debug()) this.log.debug("this.clones.length : " + this.clones.length);	
			if(this.log.is_debug()) this.log.debug("numberOfWindows : " + numberOfWindows);	
			
	        let gridWidth = Math.ceil(Math.sqrt(numberOfWindows));
	        let gridHeight = Math.ceil(numberOfWindows / gridWidth);			
	        let gridWidthRest = numberOfWindows % gridWidth;
	        let gridWidthSub = 0;
	        if(gridWidthRest > 0 && gridHeight > (gridWidth - gridWidthRest)){
	        	gridWidthSub = gridWidth - gridWidthRest;
	        }

			if(this.log.is_debug()) this.log.debug("gridWidth : " + gridWidth);	
			if(this.log.is_debug()) this.log.debug("gridHeight : " + gridHeight);
			if(this.log.is_debug()) this.log.debug("gridWidthRest : " + gridWidthRest);
			
			if(this.log.is_debug()) this.log.debug("this.groupedSlots.length : " + this.groupedSlots.length);
			if(this.log.is_debug()) this.log.debug("this.groupedSlots.length : " +  this.singleSlots.length);
	        
	        var col=0;
	        var row=0;
	        var colIdx = 0;
	        var rowIdx = 0;
	        var singleSlotIdx = 0;
	        
	        let xCenter, yCenter, fraction, slot, singleSlot;
	        let nextSlots, groupedSlots, singleSlots, nextSlotsIds, currentGrouped = 0, currentSingle = 0;
	        let currentHeight, currentWidth;
	        let log = this.log;
	        
	        let addToRow = Lang.bind(this, function(groupedSlots, ret){
	        	
	        	for(let j=0; j<groupedSlots.length; j++){
	        		
	        		let groupedSlot = groupedSlots[j];
	        		
	        		fractionW = currentWidth * 0.95;
					fractionH = currentHeight * 0.95;
			        xCenter = currentWidth/ 2. + col;
			        yCenter = currentHeight/ 2. + row;
	        		
			        slot = [xCenter, yCenter, fractionW, fractionH];
			        if(log.is_debug()) log.debug("slot : " + slot);
			        ret.push(slot);
			        groupSlot[groupedSlot] = slot;
			        
			        col += currentWidth;
	        		
	        	}	        	
	        	
	        	
	        });
	        
	        let calculateNextRow = Lang.bind(this, function(){
	        
	        	let ret = [];
	        	let gridWidth1 = gridWidth;
	        	if(rowIdx < gridWidthSub){
	        		gridWidth1--;
	        	}
	        		        	
	        	groupedSlots = this.groupedSlots.slice(currentGrouped, currentGrouped + gridWidth1);
	        	currentGrouped += groupedSlots.length;
	        	
	        	singleSlots = this.singleSlots.slice(currentSingle, currentSingle + (gridWidth1 - groupedSlots.length));
	        	currentSingle += singleSlots.length;
	        	
	        	 if(log.is_debug()) log.debug("groupedSlots : " + groupedSlots);
	        	 if(log.is_debug()) log.debug("singleSlots : " + singleSlots);
	        	
	        	currentHeight = singleWeight / gridHeight;
	        	currentWidth = singleWeight / gridWidth1;
	        	
	        	if(groupedSlots.length>0){
	        		currentHeight = groupedWeight / gridHeight;
	        		currentWidth = groupedWeight / gridWidth1;
	        	}
	        	
	        	addToRow(groupedSlots, ret);
	        	
	        	currentWidth = singleWeight / gridWidth1;
	        	
	        	addToRow(singleSlots, ret);
	        	
	        	if(col > singleWeight){
		        	for(let j=0; j<ret.length; j++){
		        		
		        		let slot1 = ret[j];
		        		slot1[0] = slot1[0] / col * singleWeight;
		        		slot1[2] = slot1[2] / col * singleWeight;
		        	}
	        	} else {
	        		
		        	for(let j=0; j<ret.length; j++){
		        		
		        		let slot1 = ret[j];
		        		slot1[0] += (singleWeight - col) / 2.;
		        	}	        		
	        		
	        	}
	        	for(let j=0; j<ret.length; j++){
	        		
	        		let slot1 = ret[j];
	        		if(log.is_debug()) log.debug("slot1 : " + slot1);
	        	}
	        	
	        	return ret;
	        	
	        	
	        });
	        	
	        while(!nextSlots || nextSlots.length > 0){
	        	
	        	nextSlots = calculateNextRow();
	        	
	        	if(nextSlots.length > 0){
	        		slots = slots.concat(nextSlots);
	        		row += currentHeight;
	        		rowIdx++;
	        		col = 0;
	        	
	        	}
	        	
	        }	
		
			
	    	for(let j=0; j<slots.length; j++){
	    		
	    		let slot1 = slots[j];
	    		slot1[1] = slot1[1] / row;
	    		slot1[3] = slot1[3] / row;
	    		
	    	}
			
		}
		
		var ret = [];
		
		for(var i=0; i<this.clones.length; i++){
			
			var cloneId = this.clones[i];
			
			var cloneGroup = this.cloneGroup[cloneId];
			var cloneSlot = groupSlot[cloneGroup];
			
			ret.push(cloneSlot);
			
		}		
		if(this.log.is_debug()) this.log.debug("ret.length : " + ret);
		return ret;
		
	}
	
	this.getSlotGeometry = function(slot, workspace, prev){
		
		if(slot.length == 3){
			return prev(slot);		
		}
		
		let [xCenter, yCenter, fractionW, fractionH] = slot;
			
		let width = workspace._width * fractionW;
        let height = workspace._height * fractionH;
		
        let x = workspace._x + xCenter * workspace._width - width / 2 ;
        let y = workspace._y + yCenter * workspace._height - height / 2;

        return [x, y, width, height];

	}
	
	this.computeWindowLayout = function(metaWindow, slot, prev){
		
		var myWindow = this.extension.get_window(metaWindow);
		
		if(!myWindow.group){
			return 	prev(metaWindow, slot);	
		} else {
			
			var topmost_group = myWindow.group.get_topmost_group();
			var id = topmost_group.id();
			if(this.groupWindowLayouts[id]){
				
				return this.groupWindowLayouts[id][myWindow.id()];
				
			} else {
			
				var outer_rect = topmost_group.outer_rect();
				let [x,y,scale] = this._prevComputeWindowLayout(prev, outer_rect, metaWindow.get_workspace(), slot);
				
				let width = outer_rect.width * scale;
				let height = outer_rect.height * scale;
				
				var scaled_group_rect = new Meta.Rectangle({ x: x, y: y, width: width, height: height});
				let groupWindowLayout = this.calculateGroupWindowLayouts(topmost_group, scaled_group_rect, scale);
			
				this.groupWindowLayouts[id] = groupWindowLayout;
				return groupWindowLayout[myWindow.id()];
				
			}
		}
	}
	
	this.calculateGroupWindowLayouts =  function(topmost_group, scaled_group_rect, scale){
		
		var ret = {};
		var log = this.log;
		var scaled_gap = topmost_group.gap_between_windows() * scale;
		
		var calculateWindowLayout = function(group, rect){
			
			let first = group.first;
			let second = group.second;
			let x,y,width,height,x1,y1;
			
			if(group.type == WindowGroup.HORIZONTAL_GROUP){
				
				x = rect.x;
				y = rect.y;
				width = rect.width * group.splitPercent;
				height = rect.height;
				
				var first_scaled = new Meta.Rectangle({ x: x, y: y, width: width, height: height});
				
				x = x + width + scaled_gap;
				width = rect.x + rect.width - x;
				
				var second_scaled = new Meta.Rectangle({ x: x, y: y, width: width, height: height});
				
			} else {
				
				x = rect.x;
				y = rect.y;
				width = rect.width;
				height = rect.height * group.splitPercent;
				
				var first_scaled = new Meta.Rectangle({ x: x, y: y, width: width, height: height});
				
				y = y + height + scaled_gap;
				height = rect.y + rect.height - y;
				
				var second_scaled = new Meta.Rectangle({ x: x, y: y, width: width, height: height});
				
			}
			
			
			if(first.first){
				calculateWindowLayout(first, first_scaled);		
			} else {
				
				x1 = first_scaled.x;
				y1 = first_scaled.y;
				ret[first.id()] = [x1,y1,scale];
				
			}
			
			if(second.first){
			
				calculateWindowLayout(second, second_scaled);					
			
			} else {
				
				x1 = second_scaled.x;
				y1 = second_scaled.y;
				
				ret[second.id()] = [x1,y1,scale];			
				
			}
			
			
		}
		calculateWindowLayout(topmost_group, scaled_group_rect);
		
		return ret;
	}
}

OverviewModifier.register = function(extension){
	if(OverviewModifier._registered) return;
	
	var prevComputeAllWindowSlots = GSWorkspace.prototype._computeAllWindowSlots;
	var prevDestroy = GSWorkspace.prototype.destroy;
	var prevComputeWindowLayout = GSWorkspace.prototype._computeWindowLayout;
	var prevOrderWindowsByMotionAndStartup = GSWorkspace.prototype._orderWindowsByMotionAndStartup
	var prevGetSlotGeometry = GSWorkspace.prototype._getSlotGeometry;
	
	let version6 = prevComputeAllWindowSlots && prevDestroy && prevComputeWindowLayout && prevOrderWindowsByMotionAndStartup 
					&& prevGetSlotGeometry;
	
	if(version6){
	
		GSWorkspace.prototype._computeAllWindowSlots = function(totalWindows){
			
			this._shellTileOverviewModifier = new OverviewModifier(this, extension);
			var numSlots = this._shellTileOverviewModifier.computeNumWindowSlots();
			
			var prev = Lang.bind(this, prevComputeAllWindowSlots);
			var prevComputeWindowLayout1 = Lang.bind(this, prevComputeWindowLayout);
			return this._shellTileOverviewModifier.computeWindowSlots(numSlots, prev, prevComputeWindowLayout1);
		}
		
		GSWorkspace.prototype.destroy = function(){
			delete this._shellTileOverviewModifier;
			Lang.bind(this, prevDestroy)();
		}
		
		GSWorkspace.prototype._computeWindowLayout = function(metaWindow, slot){
			let prev = Lang.bind(this, prevComputeWindowLayout);		
			return this._shellTileOverviewModifier.computeWindowLayout(metaWindow, slot, prev);
		}
		
		GSWorkspace.prototype._orderWindowsByMotionAndStartup = function(clones, slots) {
			return clones;
		}	
		
		GSWorkspace.prototype._getSlotGeometry = function(slot){
			let prev = Lang.bind(this, prevGetSlotGeometry);
			return this._shellTileOverviewModifier.getSlotGeometry(slot, this, prev);
		}
		
	}
	
	OverviewModifier._registered = true;	
}

