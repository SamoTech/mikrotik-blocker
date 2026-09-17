/ip firewall filter
add chain=forward connection-state=established,related action=accept comment="stateful baseline"
add chain=forward dst-address-list=blocked_sites action=drop comment="block sites"
/ip firewall address-list
add list=blocked_sites address=203.0.113.10 comment="example.com"
