import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/core/utils/date_formatter.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/features/student/messages/providers/messages_provider.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String contactId;
  final String? contactName;
  const ChatScreen({super.key, required this.contactId, this.contactName});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    ref.read(chatProvider(widget.contactId).notifier).sendMessage(text);
    _controller.clear();
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 60,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final messages = ref.watch(chatProvider(widget.contactId));
    final userId = supabase.auth.currentUser?.id;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.contactName ?? t('محادثة', 'Chat')),
        ),
        body: Column(
          children: [
            // Messages list
            Expanded(
              child: messages.isEmpty
                  ? Center(child: Text(t('لا توجد رسائل', 'No messages yet'), style: const TextStyle(color: AppColors.inkMuted)))
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        final msg = messages[index];
                        final isMe = msg.senderId == userId;
                        return _MessageBubble(
                          content: msg.content,
                          isMe: isMe,
                          senderName: msg.sender?.fullName,
                          time: msg.createdAt,
                          isRead: msg.readAt != null,
                          lang: lang,
                        );
                      },
                    ),
            ),

            // Input
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: InputDecoration(
                          hintText: t('اكتب رسالة...', 'Type a message...'),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.zero,
                            borderSide: const BorderSide(color: AppColors.border),
                          ),
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Square send button with the accent fill and the hard
                    // shadow, so the one action on this screen looks like an
                    // arcade control rather than a Material FAB.
                    ArcadeButton(
                      key: const Key('chat_send'),
                      onPressed: _send,
                      size: ArcadeSize.sm,
                      child: Icon(Icons.send_rounded, color: context.arc.onAccent, size: 20),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final String content;
  final bool isMe;
  final String? senderName;
  final String time;
  final bool isRead;
  final String lang;

  const _MessageBubble({
    required this.content,
    required this.isMe,
    this.senderName,
    required this.time,
    this.isRead = false,
    required this.lang,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    return Align(
      alignment: isMe ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          // Square bubbles: radius is 0 everywhere. Who said what is carried
          // by the fill and by which side the bubble sits on, not by a tail —
          // my messages take the deep green band, theirs the plain surface.
          color: isMe ? arc.band : arc.surface,
          border: Border.all(
            color: isMe ? arc.band : arc.line,
            width: Arc.borderWidth,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              content,
              style: TextStyle(
                // `arc.ink` inverts with the theme; this used to be the bare
                // constant, which was invisible on the dark surface.
                color: isMe ? AppColors.onBand : arc.ink,
                fontSize: 14,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  timeAgo(time, arabic: lang == 'ar'),
                  style: TextStyle(
                    fontSize: 10,
                    color: isMe ? AppColors.onBandMuted : arc.inkSoft,
                  ),
                ),
                if (isMe) ...[
                  const SizedBox(width: 4),
                  Icon(
                    isRead ? Icons.done_all : Icons.done,
                    size: 14,
                    // Read receipts take the accent green, the app's one
                    // fill — a stray light blue here was the only non-brand
                    // colour left on the screen.
                    color: isRead ? arc.accent : AppColors.onBandMuted,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
