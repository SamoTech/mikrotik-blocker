# RouterOS 7.21.4
/system identity
set name="core-router"
/ip address
add address=192.0.2.1/24 interface=bridge-lan comment="LAN gateway"
/ip firewall filter
add chain=input action=accept connection-state=established,related comment="allow established"
add chain=input action=drop in-interface-list=WAN comment="drop WAN"
