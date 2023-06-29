###### COMPUTE ENGINE SETUP

## INSTALL NODE.JS

sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs




# for QUEUER
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt-get update
sudo apt-get install redis


sudo vi /etc/redis/redis.conf
  bind 0.0.0.0
  requirepass 'asdf'
  maxmemory-policy noeviction

sudo service redis-server restart



# For WORKER
sudo npm -g i pm2
