# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|
  config.vm.box = "chef/fedora-21"
  config.ssh.pty = true
  config.vm.network "forwarded_port", guest: 3000, host: 3000
  config.vm.synced_folder ".", "/project/src"

  config.vm.provider "virtualbox" do |vb|
    vb.memory = "1024"
  end

  config.vm.provision "shell", privileged: false, inline: <<-SHELL
    sudo yum install ack make gcc gcc-c++ git npm wget krb5-devel \
        mongodb mongodb-server redis tmux \
        rpmlint rpm-build \
        fontconfig-devel -y
    sudo systemctl enable mongod.service
    sudo systemctl enable redis.service
    sudo systemctl start mongod.service
    sudo systemctl start redis.service

    git config --global color.branch true
    git config --global color.diff true
    git config --global color.status true

    git config --global alias.br branch
    git config --global alias.cm commit
    git config --global alias.co checkout
    git config --global alias.fp format-patch
    git config --global alias.st status

    mkdir ~/npm-global
    npm config set prefix "~/npm-global"
    echo "export PATH=$HOME/npm-global/bin:$PATH" >> ~/.bash_profile

    npm install -g grunt-cli
    npm install -g nodelint

    cd /project/src
    git remote add upstream https://github.com/onepiecejs/nodejs-cantas
    npm install
  SHELL
end
