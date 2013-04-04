#!/bin/bash
 
control_c()
{
	echo "interrupt";
}
 
# trap keyboard interrupt (control-c)
trap control_c SIGINT
 
while true; do gnome-shell --replace; done