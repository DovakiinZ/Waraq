import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/core/utils/date_formatter.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/messages/providers/messages_provider.dart';

class MessagesContactsScreen extends ConsumerWidget {
  const MessagesContactsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final contactsAsync = ref.watch(chatContactsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.backgroundDark : AppColors.background,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          title: Text(
            t('الرسائل', 'Messages'),
            style: TextStyle(
              fontFamily: 'IBMPlexSansArabic',
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: isDark ? AppColors.inkDark : AppColors.ink,
            ),
          ),
          centerTitle: true,
        ),
        body: contactsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (contacts) {
            if (contacts.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.chat_bubble_outline_rounded,
                        size: 72,
                        color: AppColors.inkMuted.withValues(alpha: 0.3),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        t('لا توجد محادثات', 'No conversations yet'),
                        style: const TextStyle(
                          fontFamily: 'IBMPlexSansArabic',
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: AppColors.inkMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }
            return RefreshIndicator(
              color: AppColors.accent,
              onRefresh: () async => ref.invalidate(chatContactsProvider),
              child: ListView.separated(
                itemCount: contacts.length,
                separatorBuilder: (_, __) => Divider(
                  height: 0.5,
                  thickness: 0.5,
                  color: isDark ? AppColors.borderDark : AppColors.border,
                  indent: 72,
                ),
                itemBuilder: (context, index) {
                  final c = contacts[index];
                  final hasUnread = c.unreadCount > 0;

                  return InkWell(
                    onTap: () => context.push(
                      '/student/messages/${c.profile.id}',
                      extra: c.profile.fullName,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          // Avatar
                          AvatarWidget(
                            name: c.profile.fullName ?? '?',
                            imageUrl: c.profile.avatarUrl,
                            radius: 22,
                          ),
                          const SizedBox(width: 12),
                          // Name + last message
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        c.profile.fullName ?? '',
                                        style: TextStyle(
                                          fontFamily: 'IBMPlexSansArabic',
                                          fontSize: 15,
                                          fontWeight: hasUnread ? FontWeight.w700 : FontWeight.w600,
                                          color: isDark ? AppColors.inkDark : AppColors.ink,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (c.lastMessageAt != null)
                                      Text(
                                        timeAgo(c.lastMessageAt, arabic: lang.languageCode == 'ar'),
                                        style: TextStyle(
                                          fontFamily: 'IBMPlexSansArabic',
                                          fontSize: 12,
                                          color: isDark ? AppColors.inkMuted : AppColors.inkMuted,
                                        ),
                                      ),
                                  ],
                                ),
                                if (c.lastMessage != null) ...[
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          c.lastMessage!,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontFamily: 'IBMPlexSansArabic',
                                            fontSize: 14,
                                            color: isDark ? AppColors.inkMuted : AppColors.inkMuted,
                                            fontWeight: hasUnread ? FontWeight.w500 : FontWeight.normal,
                                          ),
                                        ),
                                      ),
                                      if (hasUnread) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          width: 20,
                                          height: 20,
                                          decoration: BoxDecoration(
                                            color: AppColors.accentFill,
                                            border: Border.all(color: context.arc.line, width: Arc.borderWidth),
                                          ),
                                          alignment: Alignment.center,
                                          child: Text(
                                            '${c.unreadCount}',
                                            style: const TextStyle(
                                              fontFamily: 'IBMPlexSansArabic',
                                              color: Colors.white,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
