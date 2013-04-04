
const Logger = function(name){
    let self = this;
    self.base = name;

    self.log = function(name, message){
        global.log("[" + name + "]" + self.base + " " + message);
    }

    self.error = function(message){
        self.log("ERROR", message);    
    }

    self.info = function(message){
        self.log("INFO", message);    
    }

    self.debug = function(message){
        self.log("DEBUG", message);    
    }

    self.getLogger = function(clazz){
        return new Logger(self.base + "[" + clazz + "]");
    }
}


Logger.getLogger = function(module){
    return new Logger("[" + module + "]");
}
