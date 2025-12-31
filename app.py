#!/usr/bin/env python3
"""
Linux Server Control Panel - Flask Backend
"""
import os
import json
import subprocess
import shutil
import pwd
import grp
import time
import platform
import socket
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path

from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
import psutil

app = Flask(__name__, static_folder='build', static_url_path='')
app.secret_key = os.urandom(24)
CORS(app, supports_credentials=True)

# Simple in-memory authentication (for MVP)
# In production, use proper database and hashed passwords
USERS = {
    'admin': 'admin123'  # Change this in production!
}

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if username in USERS and USERS[username] == password:
        session['authenticated'] = True
        session['username'] = username
        return jsonify({'success': True, 'message': 'Login successful'})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out'})

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    if session.get('authenticated'):
        return jsonify({'authenticated': True, 'username': session.get('username')})
    return jsonify({'authenticated': False}), 401

# Dashboard endpoints
@app.route('/api/dashboard/stats', methods=['GET'])
@login_required
def dashboard_stats():
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # IP address
        hostname = socket.gethostname()
        ip_address = socket.gethostbyname(hostname)
        try:
            # Try to get external IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip_address = s.getsockname()[0]
            s.close()
        except:
            pass
        
        # Uptime
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time
        
        return jsonify({
            'cpu': {
                'percent': cpu_percent,
                'count': cpu_count
            },
            'memory': {
                'total': memory.total,
                'used': memory.used,
                'free': memory.free,
                'percent': memory.percent
            },
            'disk': {
                'total': disk.total,
                'used': disk.used,
                'free': disk.free,
                'percent': (disk.used / disk.total) * 100
            },
            'ip_address': ip_address,
            'hostname': hostname,
            'uptime': {
                'days': uptime.days,
                'hours': uptime.seconds // 3600,
                'minutes': (uptime.seconds % 3600) // 60
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Process management
@app.route('/api/processes', methods=['GET'])
@login_required
def get_processes():
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'status', 'create_time']):
            try:
                pinfo = proc.info
                pinfo['create_time'] = datetime.fromtimestamp(pinfo['create_time']).isoformat()
                processes.append(pinfo)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort by memory usage
        processes.sort(key=lambda x: x.get('memory_percent', 0), reverse=True)
        return jsonify({'processes': processes})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/processes/<int:pid>/kill', methods=['POST'])
@login_required
def kill_process(pid):
    try:
        proc = psutil.Process(pid)
        proc.terminate()
        return jsonify({'success': True, 'message': f'Process {pid} terminated'})
    except psutil.NoSuchProcess:
        return jsonify({'error': 'Process not found'}), 404
    except psutil.AccessDenied:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Service management
@app.route('/api/services', methods=['GET'])
@login_required
def get_services():
    try:
        result = subprocess.run(['systemctl', 'list-units', '--type=service', '--no-pager', '--no-legend'],
                              capture_output=True, text=True, timeout=10)
        services = []
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                parts = line.split()
                if len(parts) >= 4:
                    name = parts[0]
                    load = parts[1]
                    active = parts[2]
                    sub = parts[3]
                    description = ' '.join(parts[4:]) if len(parts) > 4 else ''
                    services.append({
                        'name': name,
                        'load': load,
                        'active': active,
                        'sub': sub,
                        'description': description
                    })
        return jsonify({'services': services})
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Command timeout'}), 500
    except FileNotFoundError:
        return jsonify({'error': 'systemctl not found. This feature requires systemd.'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/services/<service_name>/<action>', methods=['POST'])
@login_required
def service_action(service_name, action):
    if action not in ['start', 'stop', 'restart', 'reload']:
        return jsonify({'error': 'Invalid action'}), 400
    
    try:
        result = subprocess.run(['systemctl', action, service_name],
                              capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return jsonify({'success': True, 'message': f'Service {service_name} {action}ed successfully'})
        else:
            return jsonify({'error': result.stderr}), 500
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Command timeout'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# File management
@app.route('/api/files', methods=['GET'])
@login_required
def list_files():
    path = request.args.get('path', '/')
    
    # Security: prevent directory traversal
    if '..' in path or path.startswith('/') and not path.startswith('/home') and not path.startswith('/tmp'):
        # Allow only /home, /tmp, and current directory
        if not (path.startswith('/home') or path.startswith('/tmp') or path == '/'):
            path = '/home'
    
    try:
        if not os.path.exists(path):
            return jsonify({'error': 'Path does not exist'}), 404
        
        if not os.path.isdir(path):
            return jsonify({'error': 'Path is not a directory'}), 400
        
        files = []
        for item in os.listdir(path):
            item_path = os.path.join(path, item)
            try:
                stat = os.stat(item_path)
                files.append({
                    'name': item,
                    'path': item_path,
                    'is_directory': os.path.isdir(item_path),
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'permissions': oct(stat.st_mode)[-3:]
                })
            except PermissionError:
                pass
        
        files.sort(key=lambda x: (not x['is_directory'], x['name'].lower()))
        return jsonify({'files': files, 'current_path': path})
    except PermissionError:
        return jsonify({'error': 'Permission denied'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/download', methods=['GET'])
@login_required
def download_file():
    file_path = request.args.get('path')
    if not file_path:
        return jsonify({'error': 'Path required'}), 400
    
    # Security check
    if '..' in file_path:
        return jsonify({'error': 'Invalid path'}), 400
    
    try:
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return jsonify({'error': 'File not found'}), 404
        return send_file(file_path, as_attachment=True)
    except PermissionError:
        return jsonify({'error': 'Permission denied'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    upload_path = request.form.get('path', '/tmp')
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        if not os.path.exists(upload_path):
            os.makedirs(upload_path, exist_ok=True)
        
        file_path = os.path.join(upload_path, file.filename)
        file.save(file_path)
        return jsonify({'success': True, 'message': f'File uploaded to {file_path}'})
    except PermissionError:
        return jsonify({'error': 'Permission denied'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# User management
@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    try:
        users = []
        for p in pwd.getpwall():
            users.append({
                'username': p.pw_name,
                'uid': p.pw_uid,
                'gid': p.pw_gid,
                'home': p.pw_dir,
                'shell': p.pw_shell
            })
        return jsonify({'users': users})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['POST'])
@login_required
def create_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    try:
        # Check if user exists
        try:
            pwd.getpwnam(username)
            return jsonify({'error': 'User already exists'}), 400
        except KeyError:
            pass
        
        # Create user (requires sudo)
        result = subprocess.run(['sudo', 'useradd', '-m', '-s', '/bin/bash', username],
                              capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return jsonify({'error': result.stderr}), 500
        
        # Set password
        proc = subprocess.Popen(['sudo', 'passwd', username], stdin=subprocess.PIPE,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = proc.communicate(input=f'{password}\n{password}\n', timeout=10)
        
        if proc.returncode == 0:
            return jsonify({'success': True, 'message': f'User {username} created'})
        else:
            return jsonify({'error': stderr}), 500
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Command timeout'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<username>', methods=['DELETE'])
@login_required
def delete_user(username):
    try:
        result = subprocess.run(['sudo', 'userdel', '-r', username],
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            return jsonify({'success': True, 'message': f'User {username} deleted'})
        else:
            return jsonify({'error': result.stderr}), 500
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Command timeout'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<username>/password', methods=['POST'])
@login_required
def change_password(username):
    data = request.get_json()
    password = data.get('password')
    
    if not password:
        return jsonify({'error': 'Password required'}), 400
    
    try:
        proc = subprocess.Popen(['sudo', 'passwd', username], stdin=subprocess.PIPE,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = proc.communicate(input=f'{password}\n{password}\n', timeout=10)
        
        if proc.returncode == 0:
            return jsonify({'success': True, 'message': f'Password changed for {username}'})
        else:
            return jsonify({'error': stderr}), 500
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Command timeout'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Log viewer
@app.route('/api/logs', methods=['GET'])
@login_required
def get_logs():
    log_file = request.args.get('file', '/var/log/syslog')
    lines = int(request.args.get('lines', 100))
    
    # Security: only allow specific log files
    allowed_logs = ['/var/log/syslog', '/var/log/auth.log', '/var/log/messages', '/var/log/kern.log']
    if log_file not in allowed_logs:
        # Check if it's a custom log in /var/log
        if not log_file.startswith('/var/log/') or '..' in log_file:
            return jsonify({'error': 'Invalid log file'}), 400
    
    try:
        if not os.path.exists(log_file):
            return jsonify({'error': 'Log file not found'}), 404
        
        result = subprocess.run(['tail', '-n', str(lines), log_file],
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            log_lines = result.stdout.split('\n')
            return jsonify({
                'logs': log_lines,
                'file': log_file,
                'total_lines': len(log_lines)
            })
        else:
            return jsonify({'error': result.stderr}), 500
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Command timeout'}), 500
    except PermissionError:
        return jsonify({'error': 'Permission denied'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/list', methods=['GET'])
@login_required
def list_log_files():
    try:
        log_dir = '/var/log'
        log_files = []
        for item in os.listdir(log_dir):
            item_path = os.path.join(log_dir, item)
            if os.path.isfile(item_path) and not item.endswith('.gz'):
                try:
                    stat = os.stat(item_path)
                    log_files.append({
                        'name': item,
                        'path': item_path,
                        'size': stat.st_size,
                        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
                except:
                    pass
        log_files.sort(key=lambda x: x['modified'], reverse=True)
        return jsonify({'log_files': log_files})
    except PermissionError:
        return jsonify({'error': 'Permission denied'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Command execution
@app.route('/api/command', methods=['POST'])
@login_required
def execute_command():
    data = request.get_json()
    command = data.get('command')
    
    if not command:
        return jsonify({'error': 'Command required'}), 400
    
    # Security: block dangerous commands
    dangerous_commands = ['rm -rf', 'mkfs', 'dd if=', 'format', 'fdisk']
    if any(cmd in command.lower() for cmd in dangerous_commands):
        return jsonify({'error': 'Command not allowed for security reasons'}), 403
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        return jsonify({
            'success': True,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Command timeout'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve React app for production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_file(os.path.join(app.static_folder, path))
    else:
        return send_file(os.path.join(app.static_folder, 'index.html'))

if __name__ == '__main__':
    # Check if React build exists
    if os.path.exists('build'):
        print("Serving production build (React + Flask)")
        app.run(host='0.0.0.0', port=5000, debug=False)
    else:
        print("Running in development mode (Flask API only)")
        print("Start React dev server separately with: npm start")
        app.run(host='0.0.0.0', port=5000, debug=True)

