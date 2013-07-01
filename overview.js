const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Log = Extension.imports.logger.Logger.getLogger("ShellTile");
const Lang = imports.lang;
const Meta = imports.gi.Meta;
const GSWorkspace = imports.ui.workspace.Workspace;
const WindowGroup = Extension.imports.tiling.WindowGroup;

const OverviewModifier36 = function(gsWorkspace, extension){
	
	this.gsWorkspace = gsWorkspace;
	this.extension = extension;
	this.log = Log.getLogger("OverviewModifier36");
	
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
	        let currentHeight, currentWidth, fractionW, fractionH;
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
	
	this.orderWindowsByMotionAndStartup = function(clones, slots){

		let arraySequences = {}
		for(let j=0; j<clones.length; j++){
			let clone = clones[j];
			arraySequences[clone.metaWindow.get_stable_sequence()] = j;	
		}
        
		clones.sort(function(w1, w2) {
            return w2.metaWindow.get_stable_sequence() - w1.metaWindow.get_stable_sequence();
        });
		
		let ret = [];
		for(let j=0; j<clones.length; j++){
			let clone = clones[j];
			let arraySequence = arraySequences[clone.metaWindow.get_stable_sequence()];
			ret.push(slots[arraySequence]);
		}
		
		slots.splice(0, slots.length);
		for(let j=0; j<ret.length; j++){
			let slot = ret[j];
			slots.push(slot);
		}
		
		return clones;
        
	};
	
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

function versionCompare(first, second) {
	first = first.split('.');
	second = second.split('.');
	
    for (let i = 0; i < first.length; i++) {
    	first[i] = parseInt(first[i]);
    }
    
    for (let i = 0; i < second.length; i++) {
    	second[i] = parseInt(second[i]);
    }


    for (let i = 0; i < first.length; i++) {
    	if(i >= second.length) return 1;
        if (first[i] != second[i])
            return first[i] - second[i];
    }
    if(second.length > i) return -1;
    return 0;
}


const OverviewModifier = function(){};

OverviewModifier.register = function(extension){
	if(OverviewModifier._registered) return;
	
	var prevComputeAllWindowSlots = GSWorkspace.prototype._computeAllWindowSlots;
	var prevDestroy = GSWorkspace.prototype.destroy;
	var prevComputeWindowLayout = GSWorkspace.prototype._computeWindowLayout;
	var prevOrderWindowsByMotionAndStartup = GSWorkspace.prototype._orderWindowsByMotionAndStartup
	var prevGetSlotGeometry = GSWorkspace.prototype._getSlotGeometry;
	
	let version36 = versionCompare(Config.PACKAGE_VERSION, "3.6") >= 0 && versionCompare(Config.PACKAGE_VERSION, "3.7") < 0;
	
	if(version36){
	
		GSWorkspace.prototype._computeAllWindowSlots = function(totalWindows){
			var prev = Lang.bind(this, prevComputeAllWindowSlots);
			if(!extension.enabled) return prev(totalWindows);
			
			this._shellTileOverviewModifier = new OverviewModifier36(this, extension);
			var numSlots = this._shellTileOverviewModifier.computeNumWindowSlots();
			
			var prevComputeWindowLayout1 = Lang.bind(this, prevComputeWindowLayout);
			return this._shellTileOverviewModifier.computeWindowSlots(numSlots, prev, prevComputeWindowLayout1);
		}
		
		GSWorkspace.prototype.destroy = function(){
			var prev = Lang.bind(this, prevDestroy);
			if(!extension.enabled) return prev();
			
			delete this._shellTileOverviewModifier;
			return prev();
		}
		
		GSWorkspace.prototype._computeWindowLayout = function(metaWindow, slot){
			let prev = Lang.bind(this, prevComputeWindowLayout);		
			if(!extension.enabled) return prev(metaWindow, slot);
			
			return this._shellTileOverviewModifier.computeWindowLayout(metaWindow, slot, prev);
		}
		
		GSWorkspace.prototype._orderWindowsByMotionAndStartup = function(clones, slots) {
			let prev = Lang.bind(this, prevOrderWindowsByMotionAndStartup);
			if(!extension.enabled) return prev(clones, slots);
			
			return this._shellTileOverviewModifier.orderWindowsByMotionAndStartup(clones, slots);
		}	
		
		GSWorkspace.prototype._getSlotGeometry = function(slot){
			let prev = Lang.bind(this, prevGetSlotGeometry);
			if(!extension.enabled) return prev(slot);
			
			return this._shellTileOverviewModifier.getSlotGeometry(slot, this, prev);
		}
		
	}
	
	OverviewModifier._registered = true;	
}
