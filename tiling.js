const Meta = imports.gi.Meta;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Log = Extension.imports.logger.Logger.getLogger("shelltide");


const WindowGroup = function(first, second, type, splitPercent){
	
	if(!splitPercent) splitPercent = 0.5;
	
	this.first = first;
	this.second = second;
	this.type = type
	this.splitPercent = splitPercent;
	this.log = Log.getLogger("WindowGroup");
	
	this.toString = function(){
		return "WindowGroup(first=" + this.first + ",second="+ this.second + ",type=" + this.type + ")";
	}
	
	this.get_maximized_bounds = function(){
		var works = this.first.get_workspace();
		return works.get_bounds();
	}
	
	this.maximize = function(){
		var bounds = this.get_maximized_bounds();
		this.move_resize(bounds.x, bounds.y, bounds.width, bounds.height);
	}
	
	this.save_last = function(){
		this.first.save_last();
		this.second.save_last();
	}
	
	this.outer_rect = function(){
		var first_rect = this.first.outer_rect();
		var second_rect = this.second.outer_rect();
		var x = first_rect.x;
		var y = first_rect.y;
		if(this.type == WindowGroup.HORIZONTAL_GROUP){
			var width = first_rect.width + second_rect.width;
			var height = first_rect.height;
		} else {
			var height = first_rect.height + second_rect.height;
			var width = first_rect.width;
		}
		
		var maximized_bounds = this.get_maximized_bounds();
		if(x < maximized_bounds.x) x = maximized_bounds.x;
		if(y < maximized_bounds.y) y = maximized_bounds.y;
		if(width > maximized_bounds.width) width = maximized_bounds.width;
		if(height > maximized_bounds.width) height = maximized_bounds.height;
		
		return new Meta.Rectangle({ x: x, y: y, width: width, height: height});
	}
	
	
	this.update_geometry = function(win){
		var bounds = this.outer_rect();
		var delta = win.get_delta();
		var first_last = this.first.get_last();
		var second_last = this.second.get_last();
		var splitPercent = this.splitPercent;
		
		if(win == this.first){
			
			if(this.type == WindowGroup.HORIZONTAL_GROUP && delta[2] != 0){
				bounds.width = first_last.width + second_last.width;
				splitPercent = (first_last.width + delta[2]) / bounds.width;
				
			} else if(this.type == WindowGroup.VERTICAL_GROUP && delta[3] != 0){
				bounds.height = first_last.height + second_last.height;
				splitPercent = (first_last.height + delta[3]) / bounds.height;
			}
			this.splitPercent = splitPercent;

		}/* else if(win == this.second){
			
			if(this.type == WindowGroup.HORIZONTAL_GROUP && delta[2] != 0){
				bounds.width = first_last.width + second_last.width;
				this.log.debug("bounds.width: " + bounds.width);
				splitPercent = 1 - ((second_last.width + delta[2]*2) / bounds.width);
				
			} else if(this.type == WindowGroup.VERTICAL_GROUP && delta[3] != 0){
				bounds.height = first_last.height + second_last.height;
				splitPercent = 1 - ((second_last.height + delta[3]*2) / bounds.height);
			}
			this.splitPercent = splitPercent;
			
		}*/
		this.move_resize(bounds.x, bounds.y, bounds.width, bounds.height);
	}
	
	this.move_resize = function(x, y, width, height){
		if(x===undefined || y===undefined || width===undefined || height===undefined){

			var bounds = this.outer_rect();
			
			this.move_resize(bounds.x, bounds.y, bounds.width, bounds.height);
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
		
		
		if(this.type == WindowGroup.HORIZONTAL_GROUP){
			first_width = Math.round(width * this.splitPercent);
			second_width = width - first_width;
			second_x = first_x + first_width;
			
		} else if(this.type == WindowGroup.VERTICAL_GROUP){
			first_height = Math.round(height * this.splitPercent);
			second_height = height - first_height;
			second_y = first_y + first_height;
		}
		
		this.first.move_resize(first_x, first_y, first_width, first_height);
		this.second.move_resize(second_x, second_y, second_width, second_height);
		this.first.save_last();
		this.second.save_last();
	}
	
	this.commit = function(){
		this.first.group = this;
		this.second.group = this;
		this.maximize();
		this.move_resize();
	}
}
WindowGroup.HORIZONTAL_GROUP = "horizontal";
WindowGroup.VERTICAL_GROUP = "vertical";



const DefaultTilingStrategy = function(ext){
	
	this.extension = ext;
	this.log = Log.getLogger("DefaultTilingStrategy");
	
	this.on_window_move = function(win){
		var window_under = this.get_window_under(win);
		this.log.debug(window_under);
		if(window_under){
			
			var groupPreview = this.get_window_group_preview(window_under, win);
			
			if(groupPreview) this.log.debug("preview: " + groupPreview);
			else {
				win.update_geometry();
			}
		}
		win.save_last();
	}
	
	this.on_window_moved = function(win){
		var window_under = this.get_window_under(win);
		if(window_under){
			
			var group_preview = this.get_window_group_preview(window_under, win);
			if(group_preview){
				
				group_preview.commit();
				
			}
		}
	}
	
	this.on_window_resize = function(win){
		win.update_geometry();
		win.save_last();
	}
	
	this.on_window_resized = function(win){
		
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
			
			ret = new WindowGroup(above, below, WindowGroup.HORIZONTAL_GROUP);
			
		} else if(topright.contains_rect(cursor_rect)){
			
			ret = new WindowGroup(above, below, WindowGroup.VERTICAL_GROUP);
						
		} else if(bottomleft.contains_rect(cursor_rect)){
			
			ret = new WindowGroup(below, above, WindowGroup.VERTICAL_GROUP);
						
		} else if(bottomright.contains_rect(cursor_rect)){
			
			ret = new WindowGroup(below, above, WindowGroup.HORIZONTAL_GROUP);
			
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