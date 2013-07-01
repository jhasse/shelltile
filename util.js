
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