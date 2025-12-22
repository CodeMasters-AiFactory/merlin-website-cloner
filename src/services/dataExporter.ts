/**
 * Data Exporter
 * Exports structured data in multiple formats (JSON, CSV, XML)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { StructuredData } from './structuredDataExtractor.js';

export type ExportFormat = 'json' | 'csv' | 'xml';

export interface ExportOptions {
  format: ExportFormat;
  outputPath: string;
  includeJsonLd?: boolean;
  includeMicrodata?: boolean;
  includeOpenGraph?: boolean;
  includeTwitterCards?: boolean;
  includeSchemaOrg?: boolean;
  includeMetaTags?: boolean;
}

/**
 * Data Exporter
 * Exports structured data in various formats
 */
export class DataExporter {
  /**
   * Exports structured data
   */
  async export(data: StructuredData, options: ExportOptions): Promise<string> {
    await fs.mkdir(path.dirname(options.outputPath), { recursive: true });

    switch (options.format) {
      case 'json':
        return await this.exportJSON(data, options);
      case 'csv':
        return await this.exportCSV(data, options);
      case 'xml':
        return await this.exportXML(data, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Exports as JSON
   */
  private async exportJSON(data: StructuredData, options: ExportOptions): Promise<string> {
    const exportData: any = {};

    if (options.includeJsonLd !== false) {
      exportData.jsonLd = data.jsonLd;
    }
    if (options.includeOpenGraph !== false) {
      exportData.openGraph = data.openGraph;
    }
    if (options.includeTwitterCards !== false) {
      exportData.twitterCard = data.twitterCard;
    }
    if (options.includeSchemaOrg !== false) {
      exportData.schemaOrg = data.schemaOrg;
    }
    if (options.includeMetaTags !== false) {
      exportData.metaTags = data.metaTags;
    }

    await fs.writeFile(
      options.outputPath,
      JSON.stringify(exportData, null, 2),
      'utf-8'
    );

    return options.outputPath;
  }

  /**
   * Exports as CSV
   */
  private async exportCSV(data: StructuredData, options: ExportOptions): Promise<string> {
    const rows: string[] = [];
    
    // CSV header
    rows.push('Type,Property,Value');

    // JSON-LD
    if (options.includeJsonLd !== false) {
      for (const item of data.jsonLd) {
        this.flattenObject(item, 'JSON-LD', rows);
      }
    }

    // Microdata
    if (options.includeMicrodata !== false) {
      // Microdata not implemented - skip
    }

    // Open Graph
    if (options.includeOpenGraph !== false) {
      for (const [key, value] of Object.entries(data.openGraph)) {
        rows.push(`Open Graph,${this.escapeCSV(key)},${this.escapeCSV(String(value))}`);
      }
    }

    // Twitter Cards
    if (options.includeTwitterCards !== false) {
      for (const [key, value] of Object.entries(data.twitterCard)) {
        rows.push(`Twitter Card,${this.escapeCSV(key)},${this.escapeCSV(String(value))}`);
      }
    }

    // Schema.org
    if (options.includeSchemaOrg !== false) {
      for (const item of data.schemaOrg) {
        this.flattenObject(item, 'Schema.org', rows);
      }
    }

    // Meta Tags
    if (options.includeMetaTags !== false) {
      for (const [key, value] of Object.entries(data.metaTags)) {
        rows.push(`Meta Tag,${this.escapeCSV(key)},${this.escapeCSV(String(value))}`);
      }
    }

    await fs.writeFile(options.outputPath, rows.join('\n'), 'utf-8');
    return options.outputPath;
  }

  /**
   * Exports as XML
   */
  private async exportXML(data: StructuredData, options: ExportOptions): Promise<string> {
    const xml: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<structuredData>'];

    // JSON-LD
    if (options.includeJsonLd !== false && data.jsonLd.length > 0) {
      xml.push('  <jsonLd>');
      for (const item of data.jsonLd) {
        xml.push(`    <item>${this.objectToXML(item, '    ')}</item>`);
      }
      xml.push('  </jsonLd>');
    }

    // Microdata
    // Microdata not implemented - skip

    // Open Graph
    if (options.includeOpenGraph !== false && Object.keys(data.openGraph).length > 0) {
      xml.push('  <openGraph>');
      for (const [key, value] of Object.entries(data.openGraph)) {
        xml.push(`    <${this.sanitizeXMLTag(key)}>${this.escapeXML(String(value))}</${this.sanitizeXMLTag(key)}>`);
      }
      xml.push('  </openGraph>');
    }

    // Twitter Cards
    if (options.includeTwitterCards !== false && Object.keys(data.twitterCard).length > 0) {
      xml.push('  <twitterCards>');
      for (const [key, value] of Object.entries(data.twitterCard)) {
        xml.push(`    <${this.sanitizeXMLTag(key)}>${this.escapeXML(String(value))}</${this.sanitizeXMLTag(key)}>`);
      }
      xml.push('  </twitterCards>');
    }

    // Schema.org
    if (options.includeSchemaOrg !== false && data.schemaOrg.length > 0) {
      xml.push('  <schemaOrg>');
      for (const item of data.schemaOrg) {
        xml.push(`    <item>${this.objectToXML(item, '    ')}</item>`);
      }
      xml.push('  </schemaOrg>');
    }

    // Meta Tags
    if (options.includeMetaTags !== false && Object.keys(data.metaTags).length > 0) {
      xml.push('  <metaTags>');
      for (const [key, value] of Object.entries(data.metaTags)) {
        xml.push(`    <${this.sanitizeXMLTag(key)}>${this.escapeXML(String(value))}</${this.sanitizeXMLTag(key)}>`);
      }
      xml.push('  </metaTags>');
    }

    xml.push('</structuredData>');

    await fs.writeFile(options.outputPath, xml.join('\n'), 'utf-8');
    return options.outputPath;
  }

  /**
   * Flattens object for CSV export
   */
  private flattenObject(obj: any, prefix: string, rows: string[], parentType: string = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = parentType ? `${parentType}.${key}` : key;
      const type = prefix;

      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            this.flattenObject(item, type, rows, fullKey);
          } else {
            rows.push(`${type},${this.escapeCSV(fullKey)},${this.escapeCSV(String(item))}`);
          }
        }
      } else if (typeof value === 'object') {
        this.flattenObject(value, type, rows, fullKey);
      } else {
        rows.push(`${type},${this.escapeCSV(fullKey)},${this.escapeCSV(String(value))}`);
      }
    }
  }

  /**
   * Converts object to XML
   */
  private objectToXML(obj: any, indent: string = ''): string {
    const xml: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const tag = this.sanitizeXMLTag(key);

      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            xml.push(`${indent}<${tag}>${this.objectToXML(item, indent + '  ')}${indent}</${tag}>`);
          } else {
            xml.push(`${indent}<${tag}>${this.escapeXML(String(item))}</${tag}>`);
          }
        }
      } else if (typeof value === 'object') {
        xml.push(`${indent}<${tag}>${this.objectToXML(value, indent + '  ')}${indent}</${tag}>`);
      } else {
        xml.push(`${indent}<${tag}>${this.escapeXML(String(value))}</${tag}>`);
      }
    }

    return xml.join('\n');
  }

  /**
   * Escapes CSV value
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Escapes XML value
   */
  private escapeXML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Sanitizes XML tag name
   */
  private sanitizeXMLTag(name: string): string {
    return name
      .replace(/[^a-z0-9_]/gi, '_')
      .replace(/^[0-9]/, '_$&')
      .toLowerCase();
  }
}

