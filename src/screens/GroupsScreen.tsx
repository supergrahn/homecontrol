import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../design/theme";
import { auth } from "../firebase";
import { fetchUserGroups, searchGroups } from "../services/groups";
import { Group, GroupType, NORWEGIAN_GROUP_TEMPLATES } from "../models/Group";

type GroupCategory = "mine" | "school" | "sfo_aks" | "interesse" | "nabolag" | "search";

export default function GroupsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const user = auth.currentUser;
  
  const [activeCategory, setActiveCategory] = useState<GroupCategory>("mine");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user's groups
  const { data: userGroups = [], isLoading: userGroupsLoading } = useQuery({
    queryKey: ["groups", user?.uid],
    queryFn: () => user ? fetchUserGroups(user.uid) : [],
    enabled: !!user,
  });

  // Search groups
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["groups", "search", searchQuery],
    queryFn: () => searchGroups(searchQuery),
    enabled: activeCategory === "search" && searchQuery.length > 2,
  });

  // Categorize user groups
  const categorizedGroups = React.useMemo(() => {
    const groups = {
      school: userGroups.filter(g => g.type === "school_class" || g.type === "school_grade"),
      sfo_aks: userGroups.filter(g => g.type === "sfo_group" || g.type === "aks_group"),
      interesse: userGroups.filter(g => g.type === "hobby_group"),
      nabolag: userGroups.filter(g => g.type === "neighborhood"),
      andre: userGroups.filter(g => !["school_class", "school_grade", "sfo_group", "aks_group", "hobby_group", "neighborhood"].includes(g.type)),
    };
    return groups;
  }, [userGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["groups"] });
    setRefreshing(false);
  };

  const getGroupsForCategory = (category: GroupCategory): Group[] => {
    switch (category) {
      case "mine": return userGroups;
      case "school": return categorizedGroups.school;
      case "sfo_aks": return categorizedGroups.sfo_aks;
      case "interesse": return categorizedGroups.interesse;
      case "nabolag": return categorizedGroups.nabolag;
      case "search": return searchResults;
      default: return [];
    }
  };

  const renderGroupCard = (group: Group) => {
    const template = NORWEGIAN_GROUP_TEMPLATES[group.type];
    
    return (
      <TouchableOpacity
        key={group.id}
        style={styles.groupCard}
        onPress={() => navigation.navigate("GroupDetail" as any, { id: group.id })}
      >
        <View style={styles.groupIcon}>
          <Text style={styles.groupEmoji}>{template.icon}</Text>
        </View>
        
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupType}>{template.displayName}</Text>
          
          <View style={styles.groupMeta}>
            <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{group.memberCount} medlemmer</Text>
            
            {group.statistics?.lastActivity && (
              <>
                <Text style={styles.metaDivider}>•</Text>
                <Text style={styles.metaText}>Aktiv i dag</Text>
              </>
            )}
          </View>
          
          {group.norwegianSchoolContext && (
            <Text style={styles.schoolContext}>
              🏫 {group.norwegianSchoolContext.schoolName}
              {group.norwegianSchoolContext.className && ` - ${group.norwegianSchoolContext.className}`}
            </Text>
          )}
        </View>
        
        <View style={styles.groupActions}>
          {group.statistics?.engagementScore && (
            <View style={[styles.engagementBadge, { 
              backgroundColor: group.statistics.engagementScore > 70 ? "#E8F5E8" : "#FFF3E0" 
            }]}>
              <Text style={[styles.engagementText, {
                color: group.statistics.engagementScore > 70 ? "#2E7D32" : "#E65100"
              }]}>
                {group.statistics.engagementScore > 70 ? "Aktiv" : "Stille"}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      marginLeft: 8,
    },
    categories: {
      flexDirection: "row",
      paddingHorizontal: 8,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginHorizontal: 4,
      backgroundColor: theme.colors.background,
    },
    categoryChipActive: {
      backgroundColor: theme.colors.primary,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.onSurface,
    },
    categoryTextActive: {
      color: "white",
    },
    content: {
      flex: 1,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 16,
      marginTop: 8,
    },
    groupCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      elevation: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    groupIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#F0F7FF",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    groupEmoji: {
      fontSize: 24,
    },
    groupInfo: {
      flex: 1,
    },
    groupName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    groupType: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.primary,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    groupMeta: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    metaText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    metaDivider: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginHorizontal: 6,
    },
    schoolContext: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
    },
    groupActions: {
      alignItems: "flex-end",
    },
    engagementBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginBottom: 8,
    },
    engagementText: {
      fontSize: 10,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    emptyState: {
      alignItems: "center",
      padding: 32,
    },
    emptyStateIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    createButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      flexDirection: "row",
      alignItems: "center",
    },
    createButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
  });

  const currentGroups = getGroupsForCategory(activeCategory);
  const isLoading = activeCategory === "search" ? searchLoading : userGroupsLoading;

  return (
    <View style={styles.container}>
      {/* Header with Search */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Søk etter grupper..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 0) {
                setActiveCategory("search");
              } else if (activeCategory === "search") {
                setActiveCategory("mine");
              }
            }}
          />
        </View>
        
        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categories}
        >
          {[
            { key: "mine", label: "Mine" },
            { key: "school", label: "Skole" },
            { key: "sfo_aks", label: "SFO/AKS" },
            { key: "interesse", label: "Interesser" },
            { key: "nabolag", label: "Nabolag" },
          ].map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryChip,
                activeCategory === category.key && styles.categoryChipActive,
              ]}
              onPress={() => setActiveCategory(category.key as GroupCategory)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.key && styles.categoryTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeCategory !== "search" && (
          <Text style={styles.sectionTitle}>
            {activeCategory === "mine" ? "Dine Grupper" :
             activeCategory === "school" ? "Skoleklasser" :
             activeCategory === "sfo_aks" ? "SFO & AKS" :
             activeCategory === "interesse" ? "Interessegrupper" :
             activeCategory === "nabolag" ? "Nabolagsgrupper" : "Grupper"}
          </Text>
        )}

        {isLoading ? (
          <Text style={styles.emptyStateText}>Laster...</Text>
        ) : currentGroups.length > 0 ? (
          currentGroups.map(renderGroupCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>
              {activeCategory === "search" ? "🔍" :
               activeCategory === "school" ? "🏫" :
               activeCategory === "sfo_aks" ? "⚽" :
               activeCategory === "interesse" ? "🎯" :
               activeCategory === "nabolag" ? "🏘️" : "👥"}
            </Text>
            <Text style={styles.emptyStateTitle}>
              {activeCategory === "search" && searchQuery ? "Ingen grupper funnet" :
               activeCategory === "mine" ? "Ingen grupper ennå" :
               `Ingen ${activeCategory === "school" ? "skoleklasser" :
                        activeCategory === "sfo_aks" ? "SFO/AKS grupper" :
                        activeCategory === "interesse" ? "interessegrupper" :
                        activeCategory === "nabolag" ? "nabolagsgrupper" : "grupper"}`}
            </Text>
            <Text style={styles.emptyStateText}>
              {activeCategory === "search" && searchQuery ? `Prøv et annet søkeord eller opprett en ny gruppe.` :
               activeCategory === "mine" ? "Opprett din første gruppe eller bli med i eksisterende grupper i nærheten." :
               "Du er ikke medlem av noen grupper i denne kategorien ennå."}
            </Text>
            
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate("CreateGroup" as any)}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Opprett Gruppe</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}