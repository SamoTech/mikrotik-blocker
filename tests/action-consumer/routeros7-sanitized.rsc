# Sanitized RouterOS 7 test fixture; reserved documentation addresses only.
# No credentials, production addresses, keys, or personal data.
# IPv4 firewall without IPv6 filter intentionally triggers IPV6_COVERAGE (high).
/system identity
set name="sanitized-consumer-fixture"
/ip address
add address=192.0.2.10/24 interface=bridge-test comment="documentation-only gateway"
/ip firewall filter
add chain=input action=accept connection-state=established,related comment="sanitized baseline"
add chain=input action=drop in-interface-list=WAN comment="sanitized WAN drop"
