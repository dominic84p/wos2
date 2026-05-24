import { writable, get } from 'svelte/store'

export interface VFile {
  content: string
}

export interface VFS {
  files: Record<string, VFile>   // absolute path → file
  dirs: string[]                  // directory paths (always includes '/')
}

const KEY = 'wos_vfs'

const DEFAULTS: VFS = {
  files: {
    // User files
    '/Documents/welcome.md': { content: '# Welcome to WOS\n\nThis is your personal workspace.\n' },
    '/Proxy.md': { content: '# Proxy\n\n- Proxy is deployed at [wos-proxy.therealdominic84plays.workers.dev](https://wos-proxy.therealdominic84plays.workers.dev)\n' },

    // /boot
    '/boot/grub/grub.cfg': { content: `set default=0\nset timeout=5\n\nmenuentry "WOS 1.0 GNU/Linux" {\n  linux /boot/vmlinuz-6.1.0-wos-amd64 root=UUID=4a2f1b3c-8e2d-4f9a-b1c3-d5e7f2a4c6b8 ro quiet splash\n  initrd /boot/initrd.img-6.1.0-wos-amd64\n}\n\nmenuentry "WOS 1.0 (recovery mode)" {\n  linux /boot/vmlinuz-6.1.0-wos-amd64 root=UUID=4a2f1b3c-8e2d-4f9a-b1c3-d5e7f2a4c6b8 ro recovery nomodeset\n  initrd /boot/initrd.img-6.1.0-wos-amd64\n}` },
    '/boot/vmlinuz-6.1.0-wos-amd64': { content: `\x7fELF\x02\x01\x01\x00[WOS Kernel Binary - Do Not Edit]\nLinux version 6.1.0-wos-amd64\nBuild: stable #1 SMP PREEMPT_DYNAMIC` },
    '/boot/initrd.img-6.1.0-wos-amd64': { content: '[initrd image data]' },
    '/boot/System.map-6.1.0-wos-amd64': { content: 'ffffffff81000000 T startup_64\nffffffff81001000 T _start\nffffffff81002000 T x86_64_start_kernel' },

    // /etc
    '/etc/hostname': { content: 'wos' },
    '/etc/hosts': { content: '127.0.0.1\tlocalhost\n127.0.1.1\twos\n::1\tlocalhost ip6-localhost ip6-loopback\nff02::1\tip6-allnodes\nff02::2\tip6-allrouters' },
    '/etc/fstab': { content: '# /etc/fstab: static file system information\n#\n# <file system>                           <mount pt>  <type>  <options>           <dump> <pass>\nUUID=4a2f1b3c-8e2d-4f9a-b1c3-d5e7f2a4c6b8  /           ext4    errors=remount-ro   0      1\nUUID=b8f2a1c4-1234-5678-abcd-ef0123456789  /boot       ext2    defaults            0      2\ntmpfs                                       /tmp        tmpfs   defaults,noatime    0      0' },
    '/etc/passwd': { content: 'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nnobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin\nuser:x:1000:1000:WOS User,,,:/home/user:/bin/bash' },
    '/etc/shadow': { content: 'root:!:19800:0:99999:7:::\nuser:$6$xyz$hashedpasswordgoeshere:19800:0:99999:7:::' },
    '/etc/group': { content: 'root:x:0:\ndaemon:x:1:\nsudo:x:27:user\nuser:x:1000:' },
    '/etc/os-release': { content: 'PRETTY_NAME="WOS 1.0 (Stable)"\nNAME="WOS"\nVERSION_ID="1.0"\nVERSION="1.0 (stable)"\nVERSION_CODENAME=stable\nID=wos\nID_LIKE=debian\nHOME_URL="https://wos.local"\nSUPPORT_URL="https://wos.local/support"\nBUG_REPORT_URL="https://github.com/wos/issues"' },
    '/etc/wos.conf': { content: '[system]\nversion=1.0\nbuild=stable\nkernel=6.1.0-wos-amd64\n\n[display]\nresolution=auto\nscaling=1.0\n\n[network]\ndhcp=true\ndns=1.1.1.1,8.8.8.8' },
    '/etc/crontab': { content: '# /etc/crontab: system-wide crontab\nSHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n\n17 *\t* * *\troot\tcd / && run-parts --report /etc/cron.hourly\n25 6\t* * *\troot\ttest -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )' },
    '/etc/environment': { content: 'PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games"\nLANG="en_US.UTF-8"\nDISPLAY=":0"' },

    // /home/user
    '/home/user/.bashrc': { content: '# ~/.bashrc: executed by bash(1) for non-login shells.\nexport PS1=\'\\u@wos:\\w\\$ \'\nexport PATH="$HOME/.local/bin:$PATH"\nalias ls=\'ls --color=auto\'\nalias ll=\'ls -alF\'\nalias la=\'ls -A\'\nalias grep=\'grep --color=auto\'\nalias df=\'df -h\'\nalias du=\'du -h\'' },
    '/home/user/.profile': { content: '# ~/.profile: executed by the command interpreter for login shells.\nif [ -n "$BASH_VERSION" ]; then\n    if [ -f "$HOME/.bashrc" ]; then\n        . "$HOME/.bashrc"\n    fi\nfi\nif [ -d "$HOME/bin" ] ; then\n    PATH="$HOME/bin:$PATH"\nfi' },
    '/home/user/.bash_history': { content: 'ls -la\ncd /usr/wos\ncat /etc/os-release\nsudo apt update\nclear\ntop\nhtop\nnano .bashrc\ncd /\nls' },

    // /tmp
    '/tmp/tmp_xf4k2p91': { content: '[temporary session buffer - safe to delete]' },
    '/tmp/.X0-lock': { content: '      423' },
    '/tmp/wos-session.log': { content: '[2026-05-23 12:00:01] Session started\n[2026-05-23 12:00:02] Desktop environment loaded\n[2026-05-23 12:00:03] User login: user' },

    // /var/log
    '/var/log/syslog': { content: 'May 23 12:00:00 wos kernel: [    0.000000] Linux version 6.1.0-wos-amd64\nMay 23 12:00:00 wos kernel: [    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-6.1.0-wos-amd64 root=UUID=4a2f1b3c ro quiet splash\nMay 23 12:00:01 wos kernel: [    1.248321] wos: system initialized\nMay 23 12:00:02 wos systemd[1]: Started WOS Desktop Environment.\nMay 23 12:00:03 wos wos-init[423]: WOS kernel modules loaded\nMay 23 12:00:04 wos NetworkManager[891]: <info> device (eth0): state change\nMay 23 12:00:05 wos user[1001]: pam_unix(login:session): session opened for user' },
    '/var/log/auth.log': { content: 'May 23 12:00:05 wos login[1001]: pam_unix(login:auth): authentication failure\nMay 23 12:00:05 wos login[1001]: pam_succeed_if(login:auth): requirement "uid >= 1000" met\nMay 23 12:00:05 wos login[1001]: pam_unix(login:session): session opened for user' },
    '/var/log/dpkg.log': { content: '2026-05-23 12:00:00 startup archives unpack\n2026-05-23 12:00:01 install wos-desktop 1.0\n2026-05-23 12:00:02 status installed wos-desktop 1.0\n2026-05-23 12:00:03 install wos-kernel 6.1.0\n2026-05-23 12:00:04 status installed wos-kernel 6.1.0' },

    // /usr/bin (fake binaries as stubs)
    '/usr/bin/bash': { content: 'ELF x86_64 LSB pie executable, GNU/Linux 3.2.0\n[GNU Bash 5.2.15]' },
    '/usr/bin/python3': { content: 'ELF x86_64 LSB pie executable\n[CPython 3.11.2]' },
    '/usr/bin/curl': { content: 'ELF x86_64 LSB pie executable\n[curl 7.88.1 (x86_64-pc-linux-gnu)]' },
    '/usr/bin/node': { content: 'ELF x86_64 LSB executable\n[Node.js v20.11.0]' },
    '/usr/bin/git': { content: 'ELF x86_64 LSB pie executable\n[git version 2.39.2]' },
    '/usr/bin/vim': { content: 'ELF x86_64 LSB pie executable\n[VIM - Vi IMproved 9.0]' },

    // /usr/lib
    '/usr/lib/os-release': { content: 'PRETTY_NAME="WOS 1.0 (Stable)"\nNAME="WOS"\nVERSION_ID="1.0"\nID=wos' },

    // /usr/share/doc/wos
    '/usr/share/doc/wos/README': { content: 'WOS - Web Operating System\n==========================\nVersion: 1.0 (stable)\nKernel: 6.1.0-wos-amd64\n\nThis package contains the core WOS system files.\nRemoving or modifying system directories may result in boot failure.\n\nMaintainer: WOS Team\nReport bugs to: https://github.com/wos/issues' },
    '/usr/share/doc/wos/changelog': { content: 'wos (1.0) stable; urgency=medium\n\n  * Initial stable release\n  * Added desktop environment\n  * Improved boot sequence\n  * Fixed kernel panic on startup\n\n -- WOS Team <dev@wos.local>  Fri, 23 May 2026 12:00:00 +0000' },

    // /usr/wos — THE IMPORTANT ONE
    '/usr/wos/system.elf': { content: 'ELF x86_64 LSB executable, x86-64, dynamically linked\n[WOS System Core v1.0 - CRITICAL SYSTEM FILE]\nDO NOT DELETE OR MODIFY' },
    '/usr/wos/kernel/wos.ko': { content: '[WOS Kernel Module - Core]\nvermagic: 6.1.0-wos-amd64 SMP preempt mod_unload\nauthor: WOS Team\ndescription: WOS Core Kernel Module' },
    '/usr/wos/kernel/display.ko': { content: '[WOS Kernel Module - Display Driver]\nvermagic: 6.1.0-wos-amd64 SMP preempt mod_unload' },
    '/usr/wos/modules/init.so': { content: '[WOS Init Module - shared library]' },
    '/usr/wos/modules/desktop.so': { content: '[WOS Desktop Module - shared library]' },
    '/usr/wos/modules/fs.so': { content: '[WOS Filesystem Module - shared library]' },

    // /proc (fake process info)
    '/proc/cpuinfo': { content: 'processor\t: 0\nvendor_id\t: WOSChip\ncpu family\t: 6\nmodel\t\t: 142\nmodel name\t: WOS Virtual CPU @ 3.60GHz\nstepping\t: 10\ncpu MHz\t\t: 3600.000\ncache size\t: 8192 KB\ncpu cores\t: 4\nflags\t\t: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr\nbogomips\t: 7200.00' },
    '/proc/meminfo': { content: 'MemTotal:\t\t8192000 kB\nMemFree:\t\t4096000 kB\nMemAvailable:\t\t6144000 kB\nBuffers:\t\t128000 kB\nCached:\t\t\t1024000 kB\nSwapTotal:\t\t2097152 kB\nSwapFree:\t\t2097152 kB' },
    '/proc/version': { content: 'Linux version 6.1.0-wos-amd64 (build@wos) (gcc 12.2.0) #1 SMP PREEMPT_DYNAMIC Fri May 23 12:00:00 UTC 2026' },
    '/proc/uptime': { content: '3721.45 14123.82' },

    // /dev (device stubs)
    '/dev/null': { content: '' },
    '/dev/random': { content: '[character device - entropy source]' },
    '/dev/sda': { content: '[block device - 32GB virtual disk]' },
    '/dev/sda1': { content: '[block device - partition 1 - /boot - 512MB]' },
    '/dev/sda2': { content: '[block device - partition 2 - / - 31.5GB]' },
  },
  dirs: [
    '/', '/Code', '/Documents', '/Desktop', '/Games',
    '/boot', '/boot/grub',
    '/etc',
    '/home', '/home/user',
    '/tmp',
    '/var', '/var/log',
    '/usr', '/usr/bin', '/usr/lib', '/usr/local', '/usr/local/bin', '/usr/share', '/usr/share/doc', '/usr/share/doc/wos',
    '/usr/wos', '/usr/wos/kernel', '/usr/wos/modules',
    '/proc',
    '/dev',
    '/opt',
    '/root',
    '/run',
    '/srv',
  ],
}

const JUNK_FILES = [
  '/welcome.md','/hello.py','/hello.js',
  '/Code/main.py','/Code/main.js','/Code/main.ts','/Code/main.cpp','/Code/main.c',
  '/Code/Main.java','/Code/main.rs','/Code/main.go','/Code/main.php','/Code/index.html',
  '/Code/style.css','/Code/data.json','/Code/script.sh','/Code/script.rb',
  '/Code/script.lua','/Code/Program.cs',
]

function migrate(fs: VFS): VFS {
  for (const dir of DEFAULTS.dirs) {
    if (!fs.dirs.includes(dir)) fs.dirs.push(dir)
  }
  for (const [path, file] of Object.entries(DEFAULTS.files)) {
    if (!(path in fs.files)) fs.files[path] = file
  }
  // Remove auto-generated filler files
  for (const p of JUNK_FILES) delete fs.files[p]
  return fs
}

function load(): VFS {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULTS)
    return migrate(JSON.parse(raw) as VFS)
  } catch { return structuredClone(DEFAULTS) }
}

function save(fs: VFS) {
  localStorage.setItem(KEY, JSON.stringify(fs))
}

function normalize(p: string): string {
  return '/' + p.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function parentOf(p: string): string {
  const parts = p.split('/').filter(Boolean)
  return parts.length <= 1 ? '/' : '/' + parts.slice(0, -1).join('/')
}

function createFS() {
  const store = writable<VFS>(load())

  function mutate(fn: (fs: VFS) => void) {
    store.update(fs => {
      fn(fs)
      save(fs)
      return fs
    })
  }

  return {
    subscribe: store.subscribe,

    writeFile(path: string, content: string) {
      const p = normalize(path)
      mutate(fs => {
        fs.files[p] = { content }
        // ensure parent dirs exist
        const parent = parentOf(p)
        if (!fs.dirs.includes(parent)) fs.dirs.push(parent)
      })
    },

    readFile(path: string): string {
      return get(store).files[normalize(path)]?.content ?? ''
    },

    deleteFile(path: string) {
      const p = normalize(path)
      mutate(fs => { delete fs.files[p] })
    },

    mkdir(path: string) {
      const p = normalize(path)
      mutate(fs => {
        if (!fs.dirs.includes(p)) fs.dirs.push(p)
      })
    },

    rmdir(path: string) {
      const p = normalize(path)
      mutate(fs => {
        fs.dirs = fs.dirs.filter(d => d !== p && !d.startsWith(p + '/'))
        for (const k of Object.keys(fs.files)) {
          if (k.startsWith(p + '/')) delete fs.files[k]
        }
      })
    },

    rename(oldPath: string, newPath: string) {
      const op = normalize(oldPath)
      const np = normalize(newPath)
      mutate(fs => {
        if (fs.files[op] !== undefined) {
          fs.files[np] = fs.files[op]
          delete fs.files[op]
        }
        if (fs.dirs.includes(op)) {
          fs.dirs = fs.dirs.map(d => d === op ? np : d.startsWith(op + '/') ? np + d.slice(op.length) : d)
          // move children
          for (const k of Object.keys(fs.files)) {
            if (k.startsWith(op + '/')) {
              fs.files[np + k.slice(op.length)] = fs.files[k]
              delete fs.files[k]
            }
          }
        }
      })
    },

    // Returns sorted children of a directory (dirs first, then files)
    listDir(dirPath: string): Array<{ name: string; path: string; type: 'dir' | 'file' }> {
      const fs = get(store)
      const p = normalize(dirPath)
      const prefix = p === '/' ? '/' : p + '/'

      const childDirs = fs.dirs
        .filter(d => {
          if (d === p) return false
          if (!d.startsWith(prefix)) return false
          const rest = d.slice(prefix.length)
          return rest.length > 0 && !rest.includes('/')
        })
        .map(d => ({ name: d.split('/').pop()!, path: d, type: 'dir' as const }))

      const childFiles = Object.keys(fs.files)
        .filter(f => {
          const parent = parentOf(f)
          return parent === p
        })
        .map(f => ({ name: f.split('/').pop()!, path: f, type: 'file' as const }))

      return [
        ...childDirs.sort((a, b) => a.name.localeCompare(b.name)),
        ...childFiles.sort((a, b) => a.name.localeCompare(b.name)),
      ]
    },

    exists(path: string): boolean {
      const fs = get(store)
      const p = normalize(path)
      return p in fs.files || fs.dirs.includes(p)
    },
  }
}

export const vfs = createFS()

export function extToLang(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    py: 'python', rb: 'ruby', php: 'php',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
    c: 'c', h: 'c',
    java: 'java', kt: 'kotlin',
    rs: 'rust', go: 'go',
    cs: 'csharp', swift: 'swift',
    html: 'html', htm: 'html',
    css: 'css', scss: 'scss', less: 'less',
    json: 'json', jsonc: 'json',
    md: 'markdown', mdx: 'markdown',
    xml: 'xml', svg: 'xml',
    sh: 'shell', bash: 'shell',
    sql: 'sql', yaml: 'yaml', yml: 'yaml',
    toml: 'ini', env: 'ini',
    txt: 'plaintext',
  }
  return map[ext] ?? 'plaintext'
}
