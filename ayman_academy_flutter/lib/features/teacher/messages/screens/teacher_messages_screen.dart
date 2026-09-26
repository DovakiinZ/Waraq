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

class TeacherMessagesScreen extends ConsumerWidget {
  const TeacherMessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final contactsAsync = ref.watch(chatContactsProvider);

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text(t('الرسائل', 'Messages'))),
        body: contactsAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (contacts) {
            if (contacts.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.chat_bubble_outline, size: 64, color: AppColors.inkMuted),
                    const SizedBox(height: 16),
                    Text(t('لا توجد محادثات', 'No conversations yet'), style: const TextStyle(color: AppColors.inkMuted, fontSize: 16)),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(chatContactsProvider),
              child: ListView.builder(
                itemCount: contacts.length,
                itemBuilder: (context, index) {
                  final c = contacts[index];
                  return ListTile(
                    leading: AvatarWidget(
                      name: c.profile.fullName ?? '?',
                      imageUrl: c.profile.avatarUrl,
                      radius: 24,
                    ),
                    title: Row(
                      children: [
                        Expanded(
                          child: Text(
                            c.profile.fullName ?? '',
                            style: TextStyle(fontWeight: c.unreadCount > 0 ? FontWeight.bold : FontWeight.w500),
                          ),
                        ),
                        if (c.lastMessageAt != null)
                          Text(
                            timeAgo(c.lastMessageAt, arabic: lang.languageCode == 'ar'),
                            style: const TextStyle(fontSize: 11, color: AppColors.inkMuted),
                          ),
                      ],
                    ),
                    subtitle: c.lastMessage != null
                        ? Text(
                            c.lastMessage!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              color: c.unreadCount > 0 ? context.arc.ink : AppColors.inkMuted,
                              fontWeight: c.unreadCount > 0 ? FontWeight.w500 : FontWeight.normal,
                            ),
                          )
                        : null,
                    trailing: c.unreadCount > 0
                        ? Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            // Square badge with the accent fill: radius 0
                            // applies to badges too, and text on the accent is
                            // always `onAccent`, never white.
                            decoration: BoxDecoration(
                              color: AppColors.accentFill,
                              border: Border.all(color: context.arc.line, width: Arc.borderWidth),
                            ),
                            child: Text('${c.unreadCount}', style: const TextStyle(color: AppColors.onAccent, fontSize: 11, fontWeight: FontWeight.w700)),
                          )
                        : null,
                    onTap: () => context.push(
                      '/teacher/messages/${c.profile.id}',
                      extra: c.profile.fullName,
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
