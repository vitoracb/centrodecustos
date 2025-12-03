import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  color: string;
  onPress: () => void;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon: Icon,
  label,
  color,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Icon size={24} color={color} strokeWidth={2} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    minWidth: 100,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});
