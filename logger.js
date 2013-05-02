
const Logger = function(name, level){
    let self = this;
    self.base = name;
    if(!level){
    	level = Logger.DEFAULT_LEVEL;
    }
    self.level = level;

    self.log = function(name, message, level){
    	if(level === undefined || self.level === undefined || level >= self.level){
    		global.log("[" + name + "]" + self.base + " " + message);
    	}
    }

    self.debug = function(message){
        self.log("DEBUG", message, Logger.LEVEL_DEBUG);    
    }
    
    self.info = function(message){
        self.log("INFO", message, Logger.LEVEL_INFO);    
    }

    self.warn = function(message){
        self.log("WARN", message, Logger.LEVEL_WARN);    
    }

    self.error = function(message){
        self.log("ERROR", message, Logger.LEVEL_ERROR);    
    }    
    
    self.getLogger = function(clazz){
        return new Logger(self.base + "[" + clazz + "]", self.level);
    }
}

Logger.LEVEL_DEBUG = 0;
Logger.LEVEL_INFO = 1;
Logger.LEVEL_WARN = 2;
Logger.LEVEL_ERROR = 3;
//Logger.DEFAULT_LEVEL = Logger.LEVEL_DEBUG;
Logger.DEFAULT_LEVEL = Logger.LEVEL_ERROR;

Logger.getLogger = function(module){
    return new Logger("[" + module + "]");
}
