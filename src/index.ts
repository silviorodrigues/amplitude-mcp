import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { amplitudeService } from "./services/amplitude.service.js";
import { eventsResourceTemplate, eventsResourceHandler } from "./resources/events.js";
import { EventSegmentationEvent, EventSegmentationFilter, EventSegmentationBreakdown } from "./types/amplitude.js";
import { getAmplitudeCredentials } from "./utils/config.js";

// Create MCP server
export const server = new McpServer({
  name: "amplitude-mcp",
  version: "0.0.1",
  description: "MCP server for Amplitude Analytics API"
});

server.tool("query_events",
  {
    events: z.array(z.object({
      eventType: z.string().min(1, "Event type is required"),
      propertyFilters: z.array(z.object({
        propertyName: z.string(),
        value: z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(z.union([z.string(), z.number(), z.boolean()]))
        ]),
        op: z.enum([
          'is', 'is not', 'contains', 'does not contain', '>', '<', '>=', '<='
        ])
      })).optional()
    })).min(1, "At least one event is required"),
    start: z.string().regex(/^\d{8}/, "Start date must be in YYYYMMDD format"),
    end: z.string().regex(/^\d{8}/, "End date must be in YYYYMMDD format"),
    interval: z.enum(['day', 'week', 'month']).optional(),
    groupBy: z.string().optional()
  },
  async ({ events, start, end, interval, groupBy }) => {
    try {
      const credentials = getAmplitudeCredentials();

      const queryParams = {
        events: events as EventSegmentationEvent[],
        start,
        end,
        interval,
        groupBy
      };

      const result = await amplitudeService.queryEvents(credentials, queryParams);

      return {
        content: [
          { 
            type: "text", 
            text: "Event data retrieved successfully:" 
          },
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error querying events: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }],
        isError: true
      };
    }
  }
);

server.tool("segment_events",
  {
    events: z.array(z.object({
      eventType: z.string().min(1, "Event type is required"),
      propertyFilters: z.array(z.object({
        propertyName: z.string(),
        value: z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(z.union([z.string(), z.number(), z.boolean()]))
        ]),
        op: z.enum([
          'is', 'is not', 'contains', 'does not contain', '>', '<', '>=', '<='
        ])
      })).optional()
    })).min(1, "At least one event is required"),
    start: z.string().regex(/^\d{8}/, "Start date must be in YYYYMMDD format"),
    end: z.string().regex(/^\d{8}/, "End date must be in YYYYMMDD format"),
    interval: z.enum(['day', 'week', 'month']).optional(),
    groupBy: z.string().optional(),
    filters: z.array(z.object({
      type: z.enum(['property', 'event', 'user']),
      propertyName: z.string().optional(),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.union([z.string(), z.number(), z.boolean()]))
      ]).optional(),
      op: z.enum([
        'is', 'is not', 'contains', 'does not contain', '>', '<', '>=', '<='
      ]).optional()
    })).optional(),
    breakdowns: z.array(z.object({
      type: z.enum(['event', 'user']),
      propertyName: z.string()
    })).optional()
  },
  async ({ events, start, end, interval, groupBy, filters, breakdowns }) => {
    try {
      const credentials = getAmplitudeCredentials();

      const queryParams = {
        events: events as EventSegmentationEvent[],
        start,
        end,
        interval,
        groupBy,
        filters: filters as EventSegmentationFilter[] | undefined,
        breakdowns: breakdowns as EventSegmentationBreakdown[] | undefined
      };

      const result = await amplitudeService.queryEvents(credentials, queryParams);
      
      return {
        content: [
          { 
            type: "text", 
            text: "Segmented event data retrieved successfully:" 
          },
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error segmenting events: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }],
        isError: true
      };
    }
  }
);

server.resource(
  "amplitude_events",
  eventsResourceTemplate,
  eventsResourceHandler
);

const transport = new StdioServerTransport();
await server.connect(transport);