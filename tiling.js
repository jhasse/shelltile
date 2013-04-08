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
	
	this.move_resize = function(x, y, width, height){
		if(x===undefined || y===undefined || width===undefined || height===undefined){
			var works = this.first.get_workspace();
			var bounds = works.get_bounds();
			
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
			first_width = Math.floor(width * this.splitPercent);
			second_width = width - first_width;
			second_x = first_x + first_width;
			
		} else if(this.type == WindowGroup.VERTICAL_GROUP){
			first_height = Math.floor(height * this.splitPercent);
			second_height = height - first_height;
			second_y = first_y + first_height;
		}
		
		this.first.move_resize(first_x, first_y, first_width, first_height);
		this.second.move_resize(second_x, second_y, second_width, second_height);
		
	}
}
WindowGroup.HORIZONTAL_GROUP = "horizontal";
WindowGroup.VERTICAL_GROUP = "vertical";



const DefaultTilingStrategy = function(ext){
	
	this.extension = ext;
	this.log = Log.getLogger("DefaultTilingStrategy");
	
	this.on_window_move = function(win){
		var window_under = this.get_window_under(win);
		if(window_under){
			
			var groupPreview = this.get_window_group_preview(window_under, win);
			
			this.log.debug("preview: " + groupPreview);
		}
	}
	
	this.on_window_moved = function(win){
		var window_under = this.get_window_under(win);
		if(window_under){
			
			var group_preview = this.get_window_group_preview(window_under, win);
			if(group_preview){
				
				group_preview.move_resize();
				
			}
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