# MikroTik Firewall Blocker - Layer7 example
# Illustrative only. Test the signature against real traffic before production.
# Layer7 inspection is CPU-intensive.

/ip firewall layer7-protocol
add name=l7_example regexp="example\\.com"

/ip firewall filter
add chain=forward protocol=tcp layer7-protocol=l7_example action=drop comment="L7 block example"
