If you run the devstack in a VM, you can use tmux to run the devstack services after you logoff from the machine.

### Create new tmux session

`tmux new -s devstack`

### Attach to existing tmux session

`tmux attach -t devstack`

### Syncing files

- `rsync -avz --delete -e ssh ./devstack/ user@VM_IP:~/devstack/ `
