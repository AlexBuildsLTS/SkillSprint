import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CustomMarkdownProps {
  content: string;
}

export function CustomMarkdown({ content }: CustomMarkdownProps) {
  // 1. Split the text into logical blocks based on double line breaks
  const blocks = content.split('\n\n');

  // 2. Simple Inline Parser for **bold** and `code`
  const renderInline = (text: string) => {
    // Split the text by bold or code syntax, keeping the delimiters
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} style={styles.bold}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <Text key={index} style={styles.inlineCode}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return null;

        // Render H3 Headers (### Title)
        if (trimmedBlock.startsWith('### ')) {
          return (
            <Text key={index} style={styles.h3}>
              {trimmedBlock.replace('### ', '')}
            </Text>
          );
        }

        // Render Bullet Points (* item)
        if (trimmedBlock.startsWith('* ') || trimmedBlock.startsWith('- ')) {
          // Handle multi-line bullet lists in the same block
          const listItems = trimmedBlock.split('\n');
          return (
            <View key={index} style={styles.listContainer}>
              {listItems.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.paragraph}>
                    {renderInline(item.replace(/^[\*\-]\s/, ''))}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        // Render Code Blocks (```code```)
        if (trimmedBlock.startsWith('```')) {
          const cleanCode = trimmedBlock.replace(/```/g, '').trim();
          return (
            <View key={index} style={styles.codeBlock}>
              <Text style={styles.codeText}>{cleanCode}</Text>
            </View>
          );
        }

        // Render Standard Paragraphs
        return (
          <Text key={index} style={styles.paragraph}>
            {renderInline(trimmedBlock)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  paragraph: {
    color: '#cbd5e1', // Slate 300
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
  },
  h3: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  bold: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  inlineCode: {
    backgroundColor: '#1e293b', // Dark Slate
    color: '#a78bfa', // Purple tint
    fontFamily: 'monospace',
    fontSize: 14,
  },
  codeBlock: {
    backgroundColor: '#0f172a', // Deep Slate
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 8,
    marginBottom: 16,
  },
  codeText: {
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
  },
  listContainer: {
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    color: '#6366f1', // Indigo
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
});
