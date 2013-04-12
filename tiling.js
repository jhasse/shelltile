const Meta = imports.gi.Meta;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Log = Extension.imports.logger.Logger.getLogger("shelltide");
const Window = Extension.imports.window.Window;

const WindowGroup = function(first, second, type, splitPercent){
	
	if(!splitPercent) splitPercent = 0.5;
	const DIVISION_SIZE = 10;
	
	this.first = first;
	this.second = second;
	this.type = type
	this.splitPercent = splitPercent;
	this.log = Log.getLogger("WindowGroup");
	
	this.toString = function(){
		return "WindowGroup(first=" + this.first + ",second="+ this.second + ",type=" + this.type + ")";
	}
	
	this.get_maximized_bounds = function(){
		return Window.get_maximized_bounds(this.first);
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
	}
	
	this.save_size = function(){
		this.saved_size = this.outer_rect();
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
		
		var maximized_bounds = this.get_maximized_bounds();
		if(x < maximized_bounds.x) x = maximized_bounds.x;
		if(y < maximized_bounds.y) y = maximized_bounds.y;
		if(width > maximized_bounds.width) width = maximized_bounds.width;
		if(height > maximized_bounds.width) height = maximized_bounds.height;
		
		return new Meta.Rectangle({ x: x, y: y, width: width, height: height});
	}
	
	this.width = function() { return this.outer_rect().width; }
	this.height = function() { return this.outer_rect().height; }	
	
	this.update_split_percent = function(bounds, changed){
		
		this.log.debug("update_split_percent: " + [bounds.x, bounds.y, bounds.width, bounds.height]);		

		var first_rect = this.first.outer_rect();
		var second_rect = this.second.outer_rect();
		var splitPercent = this.splitPercent;
		
		if(changed === this.first){
			
			if(this.type == WindowGroup.HORIZONTAL_GROUP){
				this.log.debug("horizontal split changed");
				splitPercent = first_rect.width / bounds.width;
				
			} else if(this.type == WindowGroup.VERTICAL_GROUP){
				this.log.debug("vertical split changed");
				splitPercent = first_rect.height / bounds.height;
			}
			this.splitPercent = splitPercent;

		} else if(changed === this.second){
			
			if(this.type == WindowGroup.HORIZONTAL_GROUP){
				this.log.debug("horizontal split changed");
				splitPercent = 1 - ((second_rect.width + DIVISION_SIZE) / bounds.width);
				
			} else if(this.type == WindowGroup.VERTICAL_GROUP ){
				this.log.debug("vertical split changed");
				splitPercent = 1 - ((second_rect.height + DIVISION_SIZE) / bounds.height);
			}
			this.splitPercent = splitPercent;
			
		}
		
	}
	
	this.update_geometry = function(win){
		
		if(win){
			
			var win_rect = win.outer_rect();
			var bounds = this.outer_rect();
			
			this.update_split_percent(bounds, win);			
			
			if(this.type == WindowGroup.HORIZONTAL_GROUP){
				bounds.height = win_rect.height;
			} else if(this.type == WindowGroup.VERTICAL_GROUP){
				bounds.width = win_rect.width;
			}
			
			this.move_resize(bounds.x, bounds.y, bounds.width, bounds.height);
			
			var bounds = this.outer_rect();
			this.update_split_percent(bounds, win);	
		
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
		
		this.log.debug(this);
		
		if(this.type == WindowGroup.HORIZONTAL_GROUP){
			first_width = Math.round(width * this.splitPercent);
			second_width = width - first_width - DIVISION_SIZE;
			second_x = first_x + first_width + DIVISION_SIZE;
			
		} else if(this.type == WindowGroup.VERTICAL_GROUP){
			first_height = Math.round(height * this.splitPercent);
			second_height = height - first_height - DIVISION_SIZE;
			second_y = first_y + first_height + DIVISION_SIZE;
		}
		
		this.log.debug("first: " + [first_x, first_y, first_width, first_height])
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
		
		this.log.debug("second: " + [second_x, second_y, second_width, second_height])
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

			this.log.debug("first1: " + [first_x, first_y, first_width, first_height])
			this.first.move_resize(first_x, first_y, first_width, first_height);
			this.log.debug("second1: " + [second_x, second_y, second_width, second_height])
			this.second.move_resize(second_x, second_y, second_width, second_height);
		}
	}
	
	this.raise = function(ascending){
		this.log.debug("raise " + ascending);
		if(this.group && ascending){
			this.group.raise(true);
		} else {
			this.first.raise();
			this.second.raise();
		}
	}
	
	this.minimize = function(ascending){
		if(this.group && ascending){
			this.group.minimize(true);
		} else {	
			this.first.minimize();
			this.second.minimize();
		}
	}
	
	this.attach = function(){
		
		if(this.first.group){
			var withGroup = this.first;
		} else {
			var withGroup = this.second;
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


		var group = this;
		while(group.group){ 
			group = group.group; 
		}
		group.maximize_size();
		group.raise();
		group.save_bounds();

	}
	
	this.detach = function(win){
		
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
			var group = this.group;
			while(group.group){
				group = group.group;				
			}
			group.update_geometry();
			delete this.group;

		} else {
			
			delete this.first.group;
			delete this.second.group;

			if(win === this.first) this.second.maximize_size();
			else this.first.maximize_size();
		}
		
		delete this.first;
		delete this.second;
	}
}
WindowGroup.HORIZONTAL_GROUP = "horizontal";
WindowGroup.VERTICAL_GROUP = "vertical";



const DefaultTilingStrategy = function(ext){
	
	this.extension = ext;
	this.log = Log.getLogger("DefaultTilingStrategy");
	
	this.on_window_move = function(win){
		win.unmaximize();
		var window_under = this.get_window_under(win);
		this.log.debug("window_under: " + window_under);
		if(window_under){
			
			var groupPreview = this.get_window_group_preview(window_under, win);
			
			if(groupPreview) this.log.debug("preview: " + groupPreview);
		}
		win.update_geometry();
	}
	
	this.on_window_moved = function(win){
		var window_under = this.get_window_under(win);
		if(window_under){
			
			var group_preview = this.get_window_group_preview(window_under, win);
			if(group_preview){
				
				if(win.group) win.group.detach(win);
				group_preview.attach();
				
			}
		}
	}
	
	this.on_window_resize = function(win){
		win.raise();
		//win.update_geometry();
		//win.save_last();
	}
	
	this.on_window_resized = function(win){
		win.update_geometry();
		this.on_window_resize(win);
	}
	
	this.on_window_maximize = function(win){
		if(win.group){
			win.group.detach(win);
			win.maximize_size();
		}
	}
	
	this.on_window_remove = function(win){
		if(win.group){
			win.group.detach(win);			
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
		}
	}
	
	this.get_window_group_preview = function(below, above){
		
		var corner_size = DefaultTilingStrategy.CORNER_SIZE;
		
		var left = below.xpos();
		var right = below.xpos() + below.width() - corner_size;
		var top = below.ypos();
		var bottom = below.ypos()  + below.height() - corner_size;
		
		var cursor_rect = this.get_cursor_rect();
		
		var topleft = new Meta.Rectangle({ x: left, y: top, width: corner_size, height: corner_size});
		var topright = new Meta.Rectangle({ x: right, y: top, width: corner_size, height: corner_size});
		var bottomleft = new Meta.Rectangle({ x: left, y: bottom, width: corner_size, height: corner_size});
		var bottomright = new Meta.Rectangle({ x: right, y: bottom, width: corner_size, height: corner_size});
		
		var ret = null;
		
		if(topleft.contains_rect(cursor_rect)){
			
			ret = new WindowGroup(above, below, WindowGroup.VERTICAL_GROUP);
			
		} else if(topright.contains_rect(cursor_rect)){
			
			ret = new WindowGroup(below, above, WindowGroup.HORIZONTAL_GROUP);
						
		} else if(bottomleft.contains_rect(cursor_rect)){
			
			ret = new WindowGroup(above, below, WindowGroup.HORIZONTAL_GROUP);
						
		} else if(bottomright.contains_rect(cursor_rect)){
			
			ret = new WindowGroup(below, above, WindowGroup.VERTICAL_GROUP);
			
		}
		if(ret) ret.extension = this.extension;
		return ret;
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
		
		for(let i=0; i<workspace_windows.length; i++){
			let win1 =  workspace_windows[i];
			
			win1 = this.extension.get_window(win1, true);
			if(win1.can_be_tiled() && !win1.is_minimized() && win1.meta_window !== win.meta_window){
			
				let actor = win1.get_actor();

				if(win1.outer_rect().contains_rect(cursor_rect)){
					
					topmost = win1;
					break;
				}
				
			}			
		}
		return topmost;
	}
	
};

DefaultTilingStrategy.CORNER_SIZE = 50;