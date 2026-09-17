# RouterOS 6.49.18
/system identity
set name="legacy-router"
/ip address
add address=198.51.100.1/24 interface=ether2 comment="WAN test"
/ip firewall filter
add chain=input action=accept connection-state=established,related comment="allow established"
add chain=input action=drop in-interface=ether1 comment="drop WAN"
