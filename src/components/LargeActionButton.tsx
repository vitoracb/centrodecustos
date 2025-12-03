import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface LargeActionButtonProps {
  icon: LucideIcon;
  label: string;
  color: string;
  onPress: () => void;
}

export const LargeActionButton: React.FC<LargeActionButtonProps> = ({
  icon: Icon,
  label,
  color,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon size={28} color="#FFFFFF" strokeWidth={2.5} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
