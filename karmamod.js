const Discord = require('discord.js')
const gist = require('snekgist')
const exec = require('child_process').exec
const config = require('./config.json') // use the provided 'config.json.example' and edit accordingly. Save as config.json before running.
const localStorage = new require('node-localstorage').LocalStorage('karmafiles')
const Ratelimiter = require('./Ratelimiter.js')
const rl = new Ratelimiter()

const client = new Discord.Client()

client.on('message', async (message) => {
  if (message.author.bot) return
  const check = rl.check(message)
  if (check === true) {
    if (message.cleanContent.startsWith(config.prefix)) {
      if (message.channel.type === 'dm') return
      const keyword = message.cleanContent.replace(config.prefix, '').trim() // Inputs ARE case sensitive; i.e. "test" and "Test" are different entries. To change to case-insensitive, replace .trim() to .trim().toLowerCase()
      const count = localStorage.getItem(keyword) || 0
      try {
        await message.reply({
          embed: {
            color: Math.floor(Math.random() * (0xFFFFFF + 1)),
            author: {
              name: client.user.username,
              icon_url: client.user.displayAvatarURL
            },
            description: `${keyword} has **${count}** Karma!`,
            timestamp: new Date()
          }
        })
      } catch (e) {
        console.log(e)
      }
    } else if ((message.cleanContent.endsWith('--')) || message.cleanContent.endsWith('++')) {
      if (message.channel.type === 'dm') return
      if (!message.guild.roles.find('name', 'rep')) {
        return message.channel.send(`**Please create the rep role and assign it to use Karma!** This will only show if no rep role exists in the guild.`)
      }
      let type
      if (message.cleanContent.endsWith('--') && message.member.roles.has(message.guild.roles.find('name', 'rep').id)) {
        type = 'minus'
      } else if (message.cleanContent.endsWith('++') && message.member.roles.has(message.guild.roles.find('name', 'rep').id)) {
        type = 'plus'
      } else {
        return
      }
      const keyword = message.cleanContent.replace(/([+-]{2,})$/m, '').trim() // Inputs ARE case sensitive; i.e. "test" and "Test" are different entries. To change to case-insensitive, replace .trim() to .trim().toLowerCase()
      let count = localStorage.getItem(keyword) || 0
      if (type === 'minus') count--
      else if (type === 'plus') count++
      console.log(`[KARMA] ${keyword} ${type}`)
      localStorage.setItem(keyword, count)
      try {
        await message.channel.send({
          embed: {
            color: Math.floor(Math.random() * (0xFFFFFF + 1)),
            author: {
              name: client.user.username,
              icon_url: client.user.displayAvatarURL
            },
            description: `[KARMA] **${keyword}** has **${count}** Karma. To lookup later use  **${config.prefix}**  and type **${config.prefix} ${keyword}**`,
            timestamp: new Date()
          }
        })
      } catch (e) {
        console.log(e)
      }
    }
  }

  if (message.content.startsWith(`<@${client.user.id}>` + ` help`)) {
    if (message.channel.type === 'dm') return
    try {
      const embed = new Discord.RichEmbed()
        .setTitle(`KarmaBot-Mod Help & Information`)
        .setURL(`https://github.com/shikhir-arora/karma-simple`)
        .setThumbnail(message.guild.iconURL)
        .setColor(Math.floor(Math.random() * (0xFFFFFF + 1)))
        .setDescription(`**Help and Information (basic usage/support) for KarmaBot-Mod**`)
        .addField(`**❯❯ Add Karma (++):**`, `To **add or increase** karma, type *any* keyword (can be a username, emoji, or any string of text) followed by two plus symbols **++** For example, typing **keyword++** will increase the karma of keyword by one. **Requires rep role**`, true)
        .addField(`**❯❯ Subtract Karma (--):**`, `To **subtract or decrease** karma, type *any* keyword (can be a username, emoji, or any string of text) followed by two minus symbols **--** For example, typing **keyword--** will decrease the karma of keyword by one. **Requires rep role.**`, true)
        .addField(`**❯❯ Lookup Karma (>k):**`, `To **lookup** karma, type **>k** followed by the keyword to lookup. For example, typing **>k keyword** will return the karma of keyword. *Anyone can lookup karma!*`, true)
        .addField(`**❯❯ Note To Users - (Whitelist):**`, `To **use KarmaBot** you must be whitelisted and have the proper role. This is typically reserved for moderators. Contact a guild mod/admin for more information. You will **not** be able to add/subtract karma without proper permissions, but you *can* still use **>k** to lookup karma.`, true)
        .addBlankField()
        .addField(`**❯❯ Support:**`, `**For support, visit:** [our Discord server](https://discord.io/joinec) or [GitHub](https://github.com/shikhir-arora/karma-simple/issues)`, true)
        .setTimestamp()
      await message.reply({embed})
    } catch (e) {
      console.error(e)
    }
  }

  const clean = (text) => {
    if (typeof (text) === 'string') { return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203)) } else { return text }
  }
  const args = message.content.split(' ').slice(1)

  if (message.content.startsWith(config.adminprefix + 'eval')) {
    if (message.author.id !== config.ownerID) return
    try {
      const code = args.join(' ')
      let evaled = eval(code)

      if (typeof evaled !== 'string') { evaled = require('util').inspect(evaled, { depth: 0 }) }

      if (evaled.includes(client.token || config.token)) {
        evaled = evaled.replace(client.token, 'REDACTED!')
      }

      if (clean(evaled).length > 2000) {
        await gist(clean(evaled))
          .then(res => {
            const embed = new Discord.MessageEmbed()
              .setTitle(`Eval output exceeds 2000 characters. View Gist.`)
              .setURL(`${res.html_url}`)
              .setColor(Math.floor(Math.random() * (0xFFFFFF + 1)))
              .setDescription(`Eval output exceeds 2000 characters. View Gist [here](${res.html_url}).`)
              .setTimestamp()
            message.channel.send({embed}).catch((e) => message.channel.send(e.message))
          })
      } else {
        message.channel.send(clean(evaled), {
          code: 'js'
        })
      }
    } catch (err) {
      console.log(err)
      err = err.toString()
      if (err.includes(client.token || config.token)) {
        err = err.replace(client.token, 'REDACTED!')
      }
      message.channel.send(`\`ERROR\` \`\`\`js\n${clean(err)}\n\`\`\``)
    }
  }

  if (message.content.startsWith(config.adminprefix + 'exec')) {
    if (message.author.id !== config.ownerID) return
    exec(args.join(' '), async (e, stdout, stderr) => {
      if (stdout.length > 2000 || stderr.length > 2000) {
        await gist(`${stdout}\n\n${stderr}`)
          .then(res => {
            const embed = new Discord.MessageEmbed()
              .setTitle(`Console output exceeds 2000 characters. View Gist.`)
              .setURL(`${res.html_url}`)
              .setColor(Math.floor(Math.random() * (0xFFFFFF + 1)))
              .setDescription(`Console output exceeds 2000 characters. View Gist [here](${res.html_url}).`)
              .setTimestamp()
            message.channel.send({embed}).catch((e) => message.channel.send(e.message))
          })
      } else {
        stdout && message.channel.send(`Info: \n\`\`\`${stdout}\`\`\``)
        stderr && message.channel.send(`Errors: \n\`\`\`${stderr}\`\`\``)
        if (!stderr && !stdout) { message.react('\u2705') }
      }
    })
  }
})

client.on('ready', () => {
  console.log(`[READY] Connected as ${client.user.username}#${client.user.discriminator} ${client.user.id}`)
  client.user.setGame(`${client.user.username} help`)
})

client.on('guildCreate', (guild) => {
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`)
})

client.on('guildDelete', (guild) => {
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`)
})

client.on('disconnect', () => {
  setTimeout(() => client.destroy().then(() => client.login(config.token)), 10000)
  console.log(`[DISCONNECT] Notice: Disconnected from gateway. Attempting reconnect.`)
})

client.on('reconnecting', () => {
  console.log(`[NOTICE] ReconnectAction: Reconnecting to Discord...`)
})

client.on('error', console.error)
client.on('warn', console.warn)

process.on('unhandledRejection', (error) => {
  console.error(`Uncaught Promise Error: \n${error.stack}`)
})

client.login(config.token)
