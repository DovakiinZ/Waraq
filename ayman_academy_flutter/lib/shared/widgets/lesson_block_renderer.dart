import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/core/utils/youtube_utils.dart';
import 'package:ayman_academy_app/shared/models/lesson_block.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class LessonBlockRenderer extends ConsumerWidget {
  final LessonBlock block;

  const LessonBlockRenderer({super.key, required this.block});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(languageProvider).languageCode;
    final content = block.content(lang);
    final title = block.title(lang);

    if (!block.isPublished) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: _buildBlock(context, content, title, lang),
    );
  }

  Widget _buildBlock(BuildContext context, String content, String title, String lang) {
    final isRtl = Directionality.of(context) == TextDirection.rtl;

    switch (block.type) {
      case 'rich_text':
        return MarkdownBody(
          data: content,
          styleSheet: MarkdownStyleSheet(
            p: const TextStyle(fontSize: 15, height: 1.8),
          ),
        );

      case 'tip':
        return _SideBorderBlock(
          label: lang == 'ar' ? 'نصيحة' : 'Tip',
          icon: Icons.lightbulb_outline,
          content: content,
          background: AppColors.tipBackground,
          backgroundDark: AppColors.tipBackgroundDark,
          borderColor: AppColors.tipBorder,
          isRtl: isRtl,
        );

      case 'warning':
        return _SideBorderBlock(
          label: lang == 'ar' ? 'تنبيه' : 'Warning',
          icon: Icons.warning_amber,
          content: content,
          background: AppColors.warningBackground,
          backgroundDark: AppColors.warningBackgroundDark,
          borderColor: AppColors.warningBorder,
          isRtl: isRtl,
        );

      case 'example':
        return _SideBorderBlock(
          label: lang == 'ar' ? 'مثال' : 'Example',
          icon: Icons.auto_awesome,
          content: content,
          background: AppColors.exampleBackground,
          backgroundDark: AppColors.exampleBackgroundDark,
          borderColor: AppColors.exampleBorder,
          isRtl: isRtl,
        );

      case 'exercise':
        return _SideBorderBlock(
          label: lang == 'ar' ? 'تمرين' : 'Exercise',
          icon: Icons.edit_note,
          content: content,
          background: AppColors.exerciseBackground,
          backgroundDark: AppColors.exerciseBackgroundDark,
          borderColor: AppColors.exerciseBorder,
          isRtl: isRtl,
        );

      case 'video':
        return _VideoBlock(url: block.url);

      case 'image':
        return _ImageBlock(url: block.url);

      case 'equation':
        return _EquationBlock(content: content, title: title);

      case 'qa':
        return _QABlock(question: title, answer: content);

      case 'file':
        return _FileBlock(url: block.url, title: title, lang: lang);

      case 'link':
        return _LinkBlock(url: block.url, title: title, description: content);

      default:
        return const SizedBox.shrink();
    }
  }
}

/// A lesson callout: tip, warning, worked example, exercise.
///
/// Two colours carry the type — a thick accent bar on the **leading** edge and
/// the label — while the other three sides take the ordinary 2px arcade border,
/// so a callout reads as a member of the same family as every other panel.
///
/// The accent bar is on the leading edge, so it sits on the right in Arabic and
/// the left in English: it marks where the eye enters the block.
class _SideBorderBlock extends StatelessWidget {
  final String label;
  final IconData icon;
  final String content;

  /// Wash for light mode.
  final Color background;

  /// Wash for dark mode. Required: laying the light tint on the dark ground
  /// turned every callout into a glowing slab.
  final Color backgroundDark;

  final Color borderColor;
  final bool isRtl;

  const _SideBorderBlock({
    required this.label,
    required this.icon,
    required this.content,
    required this.background,
    required this.backgroundDark,
    required this.borderColor,
    required this.isRtl,
  });

  @override
  Widget build(BuildContext context) {
    final arc = context.arc;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = BorderSide(color: borderColor, width: 6);
    final plain = BorderSide(color: arc.line, width: Arc.borderWidth);

    return Container(
      decoration: BoxDecoration(
        color: isDark ? backgroundDark : background,
        border: Border(
          right: isRtl ? accent : plain,
          left: isRtl ? plain : accent,
          top: plain,
          bottom: plain,
        ),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: borderColor),
              const SizedBox(width: 6),
              Text(label, style: TextStyle(color: borderColor, fontWeight: FontWeight.w700, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 8),
          Text(content, style: TextStyle(fontSize: 14, height: 1.8, color: arc.ink)),
        ],
      ),
    );
  }
}

class _VideoBlock extends StatelessWidget {
  final String? url;

  const _VideoBlock({this.url});

  @override
  Widget build(BuildContext context) {
    final videoId = extractYoutubeId(url ?? '');
    if (videoId == null) {
      return Container(
        height: 200,
        decoration: BoxDecoration(
          color: context.arc.wash,
        ),
        child: const Center(child: Text('Video unavailable')),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.zero,
      child: InkWell(
        onTap: () => launchUrl(Uri.parse(url!), mode: LaunchMode.externalApplication),
        child: Container(
          height: 200,
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.zero,
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              CachedNetworkImage(
                imageUrl: 'https://img.youtube.com/vi/$videoId/hqdefault.jpg',
                fit: BoxFit.cover,
                width: double.infinity,
                height: 200,
                placeholder: (_, _) => const Center(child: CircularProgressIndicator()),
                errorWidget: (_, _2, ___) => const Icon(Icons.error),
              ),
              Container(
                decoration: BoxDecoration(
                  color: Colors.black45,
                  borderRadius: BorderRadius.zero,
                ),
                padding: const EdgeInsets.all(12),
                child: const Icon(Icons.play_arrow, color: Colors.white, size: 36),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ImageBlock extends StatelessWidget {
  final String? url;

  const _ImageBlock({this.url});

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) return const SizedBox.shrink();
    return ClipRRect(
      borderRadius: BorderRadius.zero,
      child: CachedNetworkImage(
        imageUrl: url!,
        width: double.infinity,
        fit: BoxFit.contain,
        placeholder: (_, _) => const SizedBox(
          height: 150,
          child: Center(child: CircularProgressIndicator()),
        ),
        errorWidget: (_, _2, ___) => Container(
          height: 150,
          color: context.arc.wash,
          child: const Center(child: Icon(Icons.broken_image, size: 40)),
        ),
      ),
    );
  }
}

class _EquationBlock extends StatelessWidget {
  final String content;
  final String title;

  const _EquationBlock({required this.content, required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? AppColors.equationBackgroundDark
            : AppColors.equationBackground,
        border: Border.all(color: AppColors.equationBorder, width: Arc.borderWidth),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          if (title.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(title, style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
            ),
          Text(
            content,
            style: const TextStyle(fontFamily: 'monospace', fontSize: 18),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _QABlock extends StatefulWidget {
  final String question;
  final String answer;

  const _QABlock({required this.question, required this.answer});

  @override
  State<_QABlock> createState() => _QABlockState();
}

class _QABlockState extends State<_QABlock> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark
            ? AppColors.qaBackgroundDark
            : AppColors.qaBackground,
        border: Border.all(color: AppColors.qaBorder, width: Arc.borderWidth),
      ),
      child: Column(
        children: [
          ListTile(
            title: Row(
              children: [
                Text('Q: ', style: TextStyle(color: AppColors.qaBorder, fontWeight: FontWeight.bold)),
                Expanded(child: Text(widget.question, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14))),
              ],
            ),
            trailing: Icon(_expanded ? Icons.expand_less : Icons.expand_more),
            onTap: () => setState(() => _expanded = !_expanded),
          ),
          if (_expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('A: ', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold)),
                  Expanded(child: Text(widget.answer, style: const TextStyle(fontSize: 14, height: 1.7))),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _FileBlock extends StatelessWidget {
  final String? url;
  final String title;
  final String lang;

  const _FileBlock({this.url, required this.title, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: context.arc.line, width: Arc.borderWidth),
      ),
      child: ListTile(
        leading: Icon(Icons.attach_file, color: context.arc.mid),
        title: Text(title.isNotEmpty ? title : (lang == 'ar' ? 'ملف مرفق' : 'Attached file')),
        trailing: const Icon(Icons.download),
        onTap: url != null ? () => launchUrl(Uri.parse(url!), mode: LaunchMode.externalApplication) : null,
      ),
    );
  }
}

class _LinkBlock extends StatelessWidget {
  final String? url;
  final String title;
  final String description;

  const _LinkBlock({this.url, required this.title, required this.description});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.info, width: Arc.borderWidth),
        color: AppColors.info.withValues(alpha: 0.12),
      ),
      child: ListTile(
        leading: const Icon(Icons.link, color: AppColors.info),
        title: Text(title.isNotEmpty ? title : (url ?? ''), style: const TextStyle(color: AppColors.info)),
        subtitle: description.isNotEmpty ? Text(description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)) : null,
        onTap: url != null ? () => launchUrl(Uri.parse(url!), mode: LaunchMode.externalApplication) : null,
      ),
    );
  }
}
