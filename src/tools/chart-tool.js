/**
 * Chart Tool (Mock)
 * Generates Chart.js configuration objects based on user requests
 */

const llmService = require('../services/llm');
const logger = require('../utils/logger');

/**
 * Predefined chart templates with realistic mock data
 */
const CHART_TEMPLATES = {
  employeeAttendance: {
    type: 'bar',
    data: {
      labels: ['January', 'February', 'March', 'April', 'May', 'June'],
      datasets: [
        {
          label: 'Present',
          data: [245, 238, 251, 243, 239, 248],
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Absent',
          data: [5, 12, 9, 7, 11, 2],
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Employee Attendance (6 Months)'
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Days'
          }
        }
      }
    }
  },

  leaveBalance: {
    type: 'line',
    data: {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Annual Leave Remaining',
          data: [20, 15, 10, 5],
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Sick Leave Remaining',
          data: [10, 8, 6, 4],
          borderColor: 'rgba(255, 206, 86, 1)',
          backgroundColor: 'rgba(255, 206, 86, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Leave Balance Tracking'
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Days Remaining'
          }
        }
      }
    }
  },

  departmentDistribution: {
    type: 'pie',
    data: {
      labels: ['Engineering', 'Sales', 'Marketing', 'HR', 'Operations'],
      datasets: [
        {
          label: 'Employees',
          data: [45, 30, 20, 15, 25],
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Department Distribution'
        },
        legend: {
          position: 'right'
        }
      }
    }
  },

  performanceMetrics: {
    type: 'bar',
    data: {
      labels: ['Project Completion', 'Code Quality', 'Team Collaboration', 'Innovation', 'Customer Satisfaction'],
      datasets: [
        {
          label: 'Team Performance (%)',
          data: [92, 88, 95, 85, 90],
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Team Performance Metrics'
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Score (%)'
          }
        }
      }
    }
  },

  wellnessUsage: {
    type: 'doughnut',
    data: {
      labels: ['Gym Membership', 'Mental Health', 'Health Checkup', 'Yoga Classes', 'Ergonomic Setup'],
      datasets: [
        {
          label: 'Utilization',
          data: [65, 45, 80, 55, 70],
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Wellness Benefits Utilization (%)'
        },
        legend: {
          position: 'bottom'
        }
      }
    }
  },

  remoteWorkTrends: {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'Remote Days',
          data: [3, 2, 3, 3],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Office Days',
          data: [2, 3, 2, 2],
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Remote vs Office Work Trends'
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
          title: {
            display: true,
            text: 'Days per Week'
          }
        }
      }
    }
  }
};

/**
 * Chart selection prompt for LLM
 */
const CHART_SELECTION_PROMPT = `You are a chart recommendation expert. Based on the user's request, select the most appropriate chart template.

Available chart templates:
1. **employeeAttendance** - Bar chart showing attendance over 6 months (present vs absent)
2. **leaveBalance** - Line chart tracking leave balances over quarters
3. **departmentDistribution** - Pie chart showing employee distribution across departments
4. **performanceMetrics** - Bar chart displaying team performance metrics
5. **wellnessUsage** - Doughnut chart showing wellness benefits utilization
6. **remoteWorkTrends** - Line chart comparing remote vs office work days

User Request: "{query}"

Context (if available): "{context}"

Select the MOST RELEVANT chart template based on the user's request.
If the request is vague, choose the most general/common chart type.

Respond with ONLY a JSON object:
{
  "chartTemplate": "templateName",
  "reasoning": "brief explanation of why this chart fits"
}`;

class ChartTool {
  constructor() {
    this.templates = CHART_TEMPLATES;
  }

  /**
   * Generate a chart configuration based on user input
   * @param {Object} input - { context, ragContext (optional) }
   * @returns {Object} Chart.js configuration
   */
  async generateChart(input) {
    try {
      const { context, ragContext } = input;
      
      logger.info('Chart Tool: Generating chart configuration...');
      logger.debug(`Context: ${context}`);

      // Use LLM to select appropriate chart template
      const selection = await this.selectChartTemplate(context, ragContext);
      
      logger.info(`Chart Tool: Selected template: ${selection.chartTemplate}`);
      logger.debug(`Reasoning: ${selection.reasoning}`);

      // Get the template
      const template = this.templates[selection.chartTemplate];
      
      if (!template) {
        logger.warn(`Template ${selection.chartTemplate} not found, using employeeAttendance as default`);
        return this.templates.employeeAttendance;
      }

      // Return a copy of the template (to avoid mutations)
      return JSON.parse(JSON.stringify(template));

    } catch (error) {
      logger.error('Chart Tool: Error generating chart:', error.message);
      
      // Fallback: return a default chart
      logger.warn('Chart Tool: Returning default chart (employeeAttendance)');
      return this.templates.employeeAttendance;
    }
  }

  /**
   * Use LLM to select the best chart template
   * @param {string} query - User query
   * @param {string} ragContext - Optional context from RAG
   * @returns {Object} { chartTemplate, reasoning }
   */
  async selectChartTemplate(query, ragContext = '') {
    try {
      const prompt = CHART_SELECTION_PROMPT
        .replace('{query}', query)
        .replace('{context}', ragContext || 'None');

      const response = await llmService.invokeJSON(prompt);
      
      // Validate response
      if (response.chartTemplate && this.templates[response.chartTemplate]) {
        return response;
      }

      // Fallback if invalid template returned
      return {
        chartTemplate: 'employeeAttendance',
        reasoning: 'Default fallback chart'
      };

    } catch (error) {
      logger.error('Chart Tool: LLM selection failed:', error.message);
      
      // Simple keyword matching fallback
      return this.keywordBasedSelection(query);
    }
  }

  /**
   * Fallback: Simple keyword-based chart selection
   * @param {string} query - User query
   * @returns {Object} { chartTemplate, reasoning }
   */
  keywordBasedSelection(query) {
    const queryLower = query.toLowerCase();

    if (queryLower.includes('attendance')) {
      return { chartTemplate: 'employeeAttendance', reasoning: 'Keyword match: attendance' };
    }
    if (queryLower.includes('leave') || queryLower.includes('vacation')) {
      return { chartTemplate: 'leaveBalance', reasoning: 'Keyword match: leave' };
    }
    if (queryLower.includes('department') || queryLower.includes('distribution')) {
      return { chartTemplate: 'departmentDistribution', reasoning: 'Keyword match: department' };
    }
    if (queryLower.includes('performance') || queryLower.includes('metric')) {
      return { chartTemplate: 'performanceMetrics', reasoning: 'Keyword match: performance' };
    }
    if (queryLower.includes('wellness') || queryLower.includes('benefit')) {
      return { chartTemplate: 'wellnessUsage', reasoning: 'Keyword match: wellness' };
    }
    if (queryLower.includes('remote') || queryLower.includes('work from home')) {
      return { chartTemplate: 'remoteWorkTrends', reasoning: 'Keyword match: remote work' };
    }

    // Default fallback
    return { chartTemplate: 'employeeAttendance', reasoning: 'Default chart' };
  }

  /**
   * Get list of available chart templates
   * @returns {Array} List of template names
   */
  getAvailableTemplates() {
    return Object.keys(this.templates);
  }

  /**
   * Get a specific template by name
   * @param {string} templateName - Name of the template
   * @returns {Object|null} Chart configuration or null
   */
  getTemplate(templateName) {
    return this.templates[templateName] ? 
      JSON.parse(JSON.stringify(this.templates[templateName])) : 
      null;
  }
}

// Create singleton instance
const chartTool = new ChartTool();

module.exports = chartTool;

