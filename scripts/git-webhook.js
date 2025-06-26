#!/usr/bin/env node

/**
 * Git Webhook Script
 * Analyzes git changes and sends purple-themed update notifications
 * Can be used as a git hook or run manually
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Add the parent directory to require path to access utils
const parentDir = path.join(__dirname, '..');
process.chdir(parentDir);

const webhook = require('./utils/webhook');

class GitAnalyzer {
    constructor() {
        this.projectRoot = process.cwd();
    }

    /**
     * Get git statistics for the last commit
     * @returns {Object} Git statistics
     */
    getLastCommitStats() {
        try {
            // Get the last commit hash
            const lastCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
            
            // Get commit message
            const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
            
            // Get author name
            const author = execSync('git log -1 --pretty=%an', { encoding: 'utf8' }).trim();
            
            // Get commit date
            const commitDate = new Date(execSync('git log -1 --pretty=%ai', { encoding: 'utf8' }).trim());
            
            // Get file statistics
            const diffStats = execSync('git diff --stat HEAD~1 HEAD', { encoding: 'utf8' });
            
            // Parse diff stats
            const stats = this.parseDiffStats(diffStats);
            
            // Get list of changed files
            const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' })
                .trim()
                .split('\n')
                .filter(file => file.length > 0);

            return {
                commitHash: lastCommit.substring(0, 8),
                commitMessage,
                author,
                commitDate,
                filesChanged: stats.filesChanged,
                linesAdded: stats.linesAdded,
                linesDeleted: stats.linesDeleted,
                changedFiles
            };
        } catch (error) {
            console.error('Error getting git stats:', error.message);
            return null;
        }
    }

    /**
     * Parse git diff --stat output
     * @param {string} diffStats - Git diff stats output
     * @returns {Object} Parsed statistics
     */
    parseDiffStats(diffStats) {
        const lines = diffStats.split('\n');
        const summaryLine = lines[lines.length - 2] || lines[lines.length - 1];
        
        let filesChanged = 0;
        let linesAdded = 0;
        let linesDeleted = 0;

        // Count files changed
        filesChanged = lines.filter(line => line.includes('|')).length;

        // Parse summary line (e.g., "5 files changed, 123 insertions(+), 45 deletions(-)")
        if (summaryLine) {
            const addedMatch = summaryLine.match(/(\d+) insertions?\(\+\)/);
            const deletedMatch = summaryLine.match(/(\d+) deletions?\(-\)/);
            
            if (addedMatch) linesAdded = parseInt(addedMatch[1]);
            if (deletedMatch) linesDeleted = parseInt(deletedMatch[1]);
        }

        return { filesChanged, linesAdded, linesDeleted };
    }

    /**
     * Get current branch name
     * @returns {string} Branch name
     */
    getCurrentBranch() {
        try {
            return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Check if we're in a git repository
     * @returns {boolean} True if in git repo
     */
    isGitRepo() {
        try {
            execSync('git rev-parse --git-dir', { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Send git update notification
     * @param {Object} options - Options for the notification
     */
    async sendGitNotification(options = {}) {
        if (!this.isGitRepo()) {
            console.log('❌ Not in a git repository');
            return;
        }

        const stats = this.getLastCommitStats();
        if (!stats) {
            console.log('❌ Could not get git statistics');
            return;
        }

        const branch = this.getCurrentBranch();
        
        // Prepare update data
        const updateData = {
            title: `Git Push to ${branch}`,
            description: stats.commitMessage || 'No commit message',
            filesChanged: stats.filesChanged,
            linesAdded: stats.linesAdded,
            linesDeleted: stats.linesDeleted,
            changedFiles: stats.changedFiles,
            author: stats.author,
            timestamp: stats.commitDate,
            ...options
        };

        console.log('📡 Sending git update notification...');
        console.log(`📊 Stats: ${stats.filesChanged} files, +${stats.linesAdded}/-${stats.linesDeleted} lines`);
        
        await webhook.sendUpdateNotification(updateData);
        console.log('✅ Git notification sent successfully');
    }

    /**
     * Analyze changes between two commits
     * @param {string} fromCommit - Starting commit
     * @param {string} toCommit - Ending commit (default: HEAD)
     */
    async sendCommitRangeNotification(fromCommit, toCommit = 'HEAD') {
        try {
            const diffStats = execSync(`git diff --stat ${fromCommit} ${toCommit}`, { encoding: 'utf8' });
            const stats = this.parseDiffStats(diffStats);
            
            const changedFiles = execSync(`git diff --name-only ${fromCommit} ${toCommit}`, { encoding: 'utf8' })
                .trim()
                .split('\n')
                .filter(file => file.length > 0);

            const commitCount = execSync(`git rev-list --count ${fromCommit}..${toCommit}`, { encoding: 'utf8' }).trim();
            
            const updateData = {
                title: `Multiple Commits (${commitCount} commits)`,
                description: `Changes from ${fromCommit.substring(0, 8)} to ${toCommit.substring(0, 8)}`,
                filesChanged: stats.filesChanged,
                linesAdded: stats.linesAdded,
                linesDeleted: stats.linesDeleted,
                changedFiles: changedFiles,
                author: 'Multiple Authors',
                timestamp: new Date()
            };

            await webhook.sendUpdateNotification(updateData);
            console.log('✅ Commit range notification sent');
        } catch (error) {
            console.error('Error sending commit range notification:', error.message);
        }
    }
}

// CLI Usage
if (require.main === module) {
    const analyzer = new GitAnalyzer();
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // Default: send notification for last commit
        analyzer.sendGitNotification().catch(console.error);
    } else if (args[0] === 'range' && args.length >= 2) {
        // Send notification for commit range
        analyzer.sendCommitRangeNotification(args[1], args[2]).catch(console.error);
    } else if (args[0] === 'manual') {
        // Send manual notification
        const title = args[1] || 'Manual Update';
        const description = args[2] || 'Manual code update';
        
        analyzer.sendGitNotification({
            title,
            description,
            author: process.env.USER || process.env.USERNAME || 'Developer'
        }).catch(console.error);
    } else {
        console.log('Usage:');
        console.log('  node git-webhook.js                    # Last commit');
        console.log('  node git-webhook.js range <from> <to>  # Commit range');
        console.log('  node git-webhook.js manual [title] [desc] # Manual notification');
    }
}

module.exports = GitAnalyzer;
