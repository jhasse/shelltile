#!/bin/bash
 
control_c()
{
	echo "interrupt";
}

log=~/gnome-shell.log
 
# trap keyboard interrupt (control-c)
trap control_c SIGINT
 
while true; do 
	gnome-shell --replace >> "$log" 2>&1
done
