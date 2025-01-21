# Troubleshoot

## rabitmq-server

* logs are found in /var/log/rabbitmq
* check if the service is running
``` systemctl status rabbitmq-server.service ```
* list user `rabbitmqctl list_users`
* status `rabbitmqctl status`

## Devastack Services 

You can check the services status by running `systemctl status` or `systemctl list-units | grep devstack@`

You can find out where it is defined in the system by running `systemctl cat devstack@<service-name>`

Then you can run the command manually to see the output.

To see the log use `journalctl --no-pager -n 300 -eu devstack@<service-name>`

### Neutron

#### Network Agents

* devstack@q-dhcp.service
* devstack@q-l3.service.
* devstack@q-meta.service


