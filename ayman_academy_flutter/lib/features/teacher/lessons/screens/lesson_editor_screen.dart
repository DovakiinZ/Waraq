import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/brand/widgets/arcade.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/lesson_block.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/lesson_block_renderer.dart';

class LessonEditorScreen extends ConsumerStatefulWidget {
  final String subjectId;
  final String? lessonId;
  const LessonEditorScreen({super.key, required this.subjectId, this.lessonId});

  @override
  ConsumerState<LessonEditorScreen> createState() => _LessonEditorScreenState();
}

class _LessonEditorScreenState extends ConsumerState<LessonEditorScreen> with SingleTickerProviderStateMixin {
  final _titleArController = TextEditingController();
  final _titleEnController = TextEditingController();
  final _summaryController = TextEditingController();
  final _videoUrlController = TextEditingController();
  final _durationController = TextEditingController();
  final _sortOrderController = TextEditingController();
  final _objectivesController = TextEditingController();
  bool _isPublished = false;
  bool _isPaid = false;
  bool _loading = false;
  bool _saving = false;
  List<LessonBlock> _blocks = [];
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    if (widget.lessonId != null) _loadLesson();
  }

  Future<void> _loadLesson() async {
    setState(() => _loading = true);
    try {
      final data = await supabase.from('lessons').select('*').eq('id', widget.lessonId!).maybeSingle();
      if (data == null) {
        if (mounted) setState(() => _loading = false);
        return;
      }
      _titleArController.text = data['title_ar'] ?? '';
      _titleEnController.text = data['title_en'] ?? '';
      _summaryController.text = data['summary_ar'] ?? '';
      _videoUrlController.text = data['video_url'] ?? '';
      _durationController.text = (data['duration_minutes'] ?? '').toString();
      _sortOrderController.text = (data['sort_order'] ?? '').toString();
      _objectivesController.text = data['objectives_ar'] ?? '';
      _isPublished = data['is_published'] ?? false;
      _isPaid = data['is_paid'] ?? false;

      final blocksData = await supabase
          .from('lesson_blocks').select('*').eq('lesson_id', widget.lessonId!).order('sort_order');
      _blocks = (blocksData as List).map((e) => LessonBlock.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _saveLesson() async {
    if (_titleArController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ref.read(languageProvider.notifier).t('العنوان مطلوب', 'Title is required')),
        backgroundColor: AppColors.error,
      ));
      return;
    }
    setState(() => _saving = true);
    final t = ref.read(languageProvider.notifier).t;
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please log in to continue')),
          );
        }
        return;
      }
      final payload = {
        'subject_id': widget.subjectId,
        'title_ar': _titleArController.text.trim(),
        'title_en': _titleEnController.text.trim().isNotEmpty ? _titleEnController.text.trim() : null,
        'summary_ar': _summaryController.text.trim().isNotEmpty ? _summaryController.text.trim() : null,
        'video_url': _videoUrlController.text.trim().isNotEmpty ? _videoUrlController.text.trim() : null,
        'duration_minutes': int.tryParse(_durationController.text),
        'is_published': _isPublished,
        'is_paid': _isPaid,
        'created_by': userId,
      };
      if (widget.lessonId != null) {
        await supabase.from('lessons').update(payload).eq('id', widget.lessonId!);
      } else {
        final existing = await supabase.from('lessons').select('sort_order')
            .eq('subject_id', widget.subjectId).order('sort_order', ascending: false).limit(1);
        payload['sort_order'] = (existing as List).isNotEmpty ? ((existing[0]['sort_order'] as int?) ?? 0) + 1 : 1;
        await supabase.from('lessons').insert(payload);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t('تم الحفظ', 'Saved')), backgroundColor: AppColors.success));
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _titleArController.dispose();
    _titleEnController.dispose();
    _summaryController.dispose();
    _videoUrlController.dispose();
    _durationController.dispose();
    _sortOrderController.dispose();
    _objectivesController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isEditing = widget.lessonId != null;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(isEditing ? t('تعديل الدرس', 'Edit Lesson') : t('درس جديد', 'New Lesson')),
          actions: [
            // Save button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: _saving
                  ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))
                  : TextButton(
                      onPressed: _saveLesson,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.accent,
                          borderRadius: BorderRadius.zero,
                        ),
                        child: Text(
                          t('حفظ', 'Save'),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                      ),
                    ),
            ),
          ],
          bottom: TabBar(
            controller: _tabController,
            tabs: [
              Tab(text: t('عام', 'General')),
              Tab(text: t('المحتوى', 'Content')),
              Tab(text: t('إعدادات', 'Settings')),
            ],
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildGeneralTab(t, lang, isDark),
                  _buildContentTab(t, lang, isDark, isEditing),
                  _buildSettingsTab(t, lang, isDark),
                ],
              ),
      ),
    );
  }

  // ═══════════════════════════════════════
  //  TAB 1: GENERAL INFO
  // ═══════════════════════════════════════
  Widget _buildGeneralTab(Function t, String lang, bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section: Title
          _sectionHeader(t('عنوان الدرس', 'Lesson Title') as String, Icons.title_rounded),
          const SizedBox(height: 12),
          _buildField(
            controller: _titleArController,
            label: t('العنوان بالعربية *', 'Arabic Title *') as String,
            isDark: isDark,
          ),
          const SizedBox(height: 12),
          _buildField(
            controller: _titleEnController,
            label: t('العنوان بالإنجليزية', 'English Title') as String,
            isDark: isDark,
            textDirection: TextDirection.ltr,
          ),
          const SizedBox(height: 24),

          // Section: Summary
          _sectionHeader(t('وصف الدرس', 'Description') as String, Icons.description_rounded),
          const SizedBox(height: 12),
          _buildField(
            controller: _summaryController,
            label: t('ملخص الدرس', 'Lesson Summary') as String,
            isDark: isDark,
            maxLines: 4,
          ),
          const SizedBox(height: 24),

          // Section: Video
          _sectionHeader(t('الفيديو', 'Video') as String, Icons.videocam_rounded),
          const SizedBox(height: 12),
          _buildField(
            controller: _videoUrlController,
            label: t('رابط يوتيوب', 'YouTube URL') as String,
            isDark: isDark,
            textDirection: TextDirection.ltr,
            hint: 'https://youtube.com/watch?v=...',
            prefixIcon: Icons.play_circle_outline_rounded,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildField(
                  controller: _durationController,
                  label: t('المدة (دقائق)', 'Duration (min)') as String,
                  isDark: isDark,
                  keyboardType: TextInputType.number,
                  prefixIcon: Icons.timer_outlined,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildField(
                  controller: _sortOrderController,
                  label: t('الترتيب', 'Order') as String,
                  isDark: isDark,
                  keyboardType: TextInputType.number,
                  prefixIcon: Icons.sort_rounded,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Section: Objectives
          _sectionHeader(t('الأهداف التعليمية', 'Learning Objectives') as String, Icons.checklist_rounded),
          const SizedBox(height: 12),
          _buildField(
            controller: _objectivesController,
            label: t('اكتب الأهداف (سطر لكل هدف)', 'One per line') as String,
            isDark: isDark,
            maxLines: 4,
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════
  //  TAB 2: CONTENT BLOCKS
  // ═══════════════════════════════════════
  Widget _buildContentTab(Function t, String lang, bool isDark, bool isEditing) {
    if (!isEditing) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.zero,
                ),
                child: const Icon(Icons.save_outlined, size: 36, color: AppColors.accent),
              ),
              const SizedBox(height: 20),
              Text(
                t('احفظ الدرس أولاً', 'Save the lesson first') as String,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                t('بعد الحفظ ستتمكن من إضافة المحتوى', 'You can add content after saving') as String,
                style: const TextStyle(color: AppColors.inkMuted, fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        // Top bar: count + preview + add
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Row(
            children: [
              Text(
                '${_blocks.length} ${t("عنصر محتوى", "content block")}${_blocks.length != 1 && lang == 'en' ? 's' : ''}',
                style: const TextStyle(fontSize: 14, color: AppColors.inkMuted, fontWeight: FontWeight.w500),
              ),
              const Spacer(),
              // Preview button
              GestureDetector(
                onTap: () => _showPreview(t, lang),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  margin: const EdgeInsets.only(left: 8, right: 8),
                  decoration: BoxDecoration(
                    color: AppColors.info.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.zero,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.visibility_rounded, size: 16, color: AppColors.info),
                      const SizedBox(width: 4),
                      Text(t('معاينة', 'Preview') as String,
                        style: TextStyle(color: AppColors.info, fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                ),
              ),
              // Add button
              GestureDetector(
                onTap: _showAddBlockSheet,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.accent,
                    borderRadius: BorderRadius.zero,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.add_rounded, size: 18, color: Colors.white),
                      const SizedBox(width: 4),
                      Text(t('إضافة', 'Add') as String,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Blocks list
        Expanded(
          child: _blocks.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.widgets_outlined, size: 48, color: AppColors.inkMuted.withValues(alpha: 0.3)),
                      const SizedBox(height: 16),
                      Text(
                        t('لا يوجد محتوى', 'No content yet') as String,
                        style: const TextStyle(color: AppColors.inkMuted, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      GestureDetector(
                        onTap: _showAddBlockSheet,
                        child: Text(
                          t('اضغط لإضافة أول عنصر', 'Tap to add your first block') as String,
                          style: const TextStyle(color: AppColors.accent, fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 80),
                  itemCount: _blocks.length,
                  itemBuilder: (context, i) {
                    final block = _blocks[i];
                    return _BlockCard(
                      key: ValueKey(block.id),
                      block: block,
                      index: i,
                      total: _blocks.length,
                      isDark: isDark,
                      t: t,
                      onEdit: () => _showBlockEditor(block.type, block),
                      onDelete: () => _confirmDeleteBlock(block.id, t),
                      onMoveUp: i > 0 ? () => _swapBlocks(i, i - 1) : null,
                      onMoveDown: i < _blocks.length - 1 ? () => _swapBlocks(i, i + 1) : null,
                      onAI: () => _showAISheet(block),
                    );
                  },
                ),
        ),
      ],
    );
  }

  // ═══════════════════════════════════════
  //  TAB 3: SETTINGS
  // ═══════════════════════════════════════
  Widget _buildSettingsTab(Function t, String lang, bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader(t('حالة النشر', 'Publishing') as String, Icons.publish_rounded),
          const SizedBox(height: 12),

          // Published toggle
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surface,
              borderRadius: BorderRadius.zero,
            ),
            child: Row(
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: _isPublished ? AppColors.success.withValues(alpha: 0.12) : AppColors.inkMuted.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.zero,
                  ),
                  child: Icon(
                    _isPublished ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                    size: 18,
                    color: _isPublished ? AppColors.success : AppColors.inkMuted,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t('منشور', 'Published') as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                      Text(
                        _isPublished
                            ? t('الدرس مرئي للطلاب', 'Visible to students') as String
                            : t('مسودة - غير مرئي', 'Draft - not visible') as String,
                        style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: _isPublished,
                  activeColor: AppColors.success,
                  onChanged: (v) => setState(() => _isPublished = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Paid toggle
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.surface,
              borderRadius: BorderRadius.zero,
            ),
            child: Row(
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: _isPaid ? AppColors.gold.withValues(alpha: 0.12) : AppColors.inkMuted.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.zero,
                  ),
                  child: Icon(
                    _isPaid ? Icons.monetization_on_rounded : Icons.money_off_rounded,
                    size: 18,
                    color: _isPaid ? AppColors.gold : AppColors.inkMuted,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t('مدفوع', 'Paid') as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                      Text(
                        _isPaid
                            ? t('يتطلب اشتراك أو شراء', 'Requires subscription') as String
                            : t('مجاني للجميع', 'Free for all') as String,
                        style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: _isPaid,
                  activeColor: AppColors.gold,
                  onChanged: (v) => setState(() => _isPaid = v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // Danger zone
          if (widget.lessonId != null) ...[
            _sectionHeader(t('منطقة الخطر', 'Danger Zone') as String, Icons.warning_rounded, color: AppColors.error),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () => _confirmDeleteLesson(t),
                icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
                label: Text(t('حذف الدرس', 'Delete Lesson') as String),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.error,
                  side: const BorderSide(color: AppColors.error),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                ),
              ),
            ),
          ],
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // ── Helpers ──
  Widget _sectionHeader(String title, IconData icon, {Color? color}) {
    return Row(
      children: [
        Icon(icon, size: 20, color: color ?? AppColors.accent),
        const SizedBox(width: 8),
        Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: color)),
      ],
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required bool isDark,
    int maxLines = 1,
    TextDirection? textDirection,
    TextInputType? keyboardType,
    String? hint,
    IconData? prefixIcon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.inkMuted)),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          textDirection: textDirection,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 20, color: AppColors.inkMuted) : null,
          ),
        ),
      ],
    );
  }

  void _showAddBlockSheet() {
    if (widget.lessonId == null) return;
    final t = ref.read(languageProvider.notifier).t;

    final blockTypes = [
      {'type': 'rich_text', 'label': t('نص', 'Text'), 'icon': Icons.text_fields_rounded, 'color': AppColors.accent},
      {'type': 'video', 'label': t('فيديو', 'Video'), 'icon': Icons.videocam_rounded, 'color': AppColors.error},
      {'type': 'image', 'label': t('صورة', 'Image'), 'icon': Icons.image_rounded, 'color': AppColors.success},
      {'type': 'tip', 'label': t('نصيحة', 'Tip'), 'icon': Icons.lightbulb_rounded, 'color': AppColors.info},
      {'type': 'warning', 'label': t('تنبيه', 'Warning'), 'icon': Icons.warning_rounded, 'color': AppColors.warning},
      {'type': 'example', 'label': t('مثال', 'Example'), 'icon': Icons.auto_awesome_rounded, 'color': AppColors.success},
      {'type': 'exercise', 'label': t('تمرين', 'Exercise'), 'icon': Icons.edit_note_rounded, 'color': AppColors.exerciseBorder},
      {'type': 'equation', 'label': t('معادلة', 'Equation'), 'icon': Icons.functions_rounded, 'color': AppColors.equationBorder},
      {'type': 'qa', 'label': t('سؤال وجواب', 'Q&A'), 'icon': Icons.quiz_rounded, 'color': AppColors.qaBorder},
      {'type': 'link', 'label': t('رابط', 'Link'), 'icon': Icons.link_rounded, 'color': AppColors.inkMuted},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 36, height: 5, margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.zero)),
            ),
            Text(t('إضافة محتوى', 'Add Content'),
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(t('اختر نوع المحتوى', 'Choose content type'),
                style: const TextStyle(fontSize: 14, color: AppColors.inkMuted)),
            const SizedBox(height: 20),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 4,
              childAspectRatio: 0.85,
              crossAxisSpacing: 8,
              mainAxisSpacing: 12,
              children: blockTypes.map((bt) {
                final color = bt['color'] as Color;
                return GestureDetector(
                  onTap: () {
                    Navigator.pop(ctx);
                    _showBlockEditor(bt['type'] as String);
                  },
                  child: Column(
                    children: [
                      Container(
                        width: 52, height: 52,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.zero,
                        ),
                        child: Icon(bt['icon'] as IconData, color: color, size: 24),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        bt['label'] as String,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  void _showBlockEditor(String type, [LessonBlock? existing]) {
    final t = ref.read(languageProvider.notifier).t;
    final contentController = TextEditingController(text: existing?.contentAr ?? '');
    final titleController = TextEditingController(text: existing?.titleAr ?? '');
    final urlController = TextEditingController(text: existing?.url ?? '');
    final needsUrl = ['video', 'image', 'file', 'link'].contains(type);
    final needsTitle = ['qa', 'equation', 'link', 'file'].contains(type);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 36, height: 5, margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.zero))),
              Text(
                existing != null ? t('تعديل المحتوى', 'Edit Content') : t('إضافة محتوى', 'Add Content'),
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 16),
              if (needsTitle) ...[
                TextFormField(controller: titleController, decoration: InputDecoration(hintText: t('العنوان', 'Title'))),
                const SizedBox(height: 12),
              ],
              if (needsUrl) ...[
                TextFormField(controller: urlController, textDirection: TextDirection.ltr,
                    decoration: InputDecoration(hintText: 'URL', prefixIcon: const Icon(Icons.link_rounded, size: 20))),
                const SizedBox(height: 12),
              ],
              TextFormField(controller: contentController, maxLines: 6,
                  decoration: InputDecoration(hintText: t('المحتوى', 'Content'))),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: () async {
                    try {
                      final nextOrder = _blocks.isEmpty ? 1 : (_blocks.last.sortOrder + 1);
                      final payload = {
                        'lesson_id': widget.lessonId,
                        'type': type,
                        'title_ar': titleController.text.trim().isNotEmpty ? titleController.text.trim() : null,
                        'content_ar': contentController.text.trim().isNotEmpty ? contentController.text.trim() : null,
                        'url': urlController.text.trim().isNotEmpty ? urlController.text.trim() : null,
                        'sort_order': existing?.sortOrder ?? nextOrder,
                        'is_published': true,
                      };
                      if (existing != null) {
                        await supabase.from('lesson_blocks').update(payload).eq('id', existing.id);
                      } else {
                        await supabase.from('lesson_blocks').insert(payload);
                      }
                      Navigator.pop(ctx);
                      _loadLesson();
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.zero)),
                  child: Text(t('حفظ', 'Save'), style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _swapBlocks(int from, int to) async {
    final blockA = _blocks[from];
    final blockB = _blocks[to];
    _blocks[from] = blockB;
    _blocks[to] = blockA;
    setState(() {});
    await supabase.from('lesson_blocks').update({'sort_order': to + 1}).eq('id', blockA.id);
    await supabase.from('lesson_blocks').update({'sort_order': from + 1}).eq('id', blockB.id);
  }

  void _showAISheet(LessonBlock block) {
    final t = ref.read(languageProvider.notifier).t;
    final actions = [
      {'action': 'expand', 'label': t('توسيع المحتوى', 'Expand'), 'icon': Icons.unfold_more_rounded, 'color': AppColors.accent},
      {'action': 'simplify', 'label': t('تبسيط', 'Simplify'), 'icon': Icons.compress_rounded, 'color': AppColors.info},
      {'action': 'generate_example', 'label': t('إنشاء مثال', 'Generate Example'), 'icon': Icons.auto_awesome_rounded, 'color': AppColors.success},
      {'action': 'improve_language', 'label': t('تحسين اللغة', 'Improve Language'), 'icon': Icons.spellcheck_rounded, 'color': AppColors.warning},
      {'action': 'translate_ar_en', 'label': t('ترجمة عربي←إنجليزي', 'Translate AR→EN'), 'icon': Icons.translate_rounded, 'color': AppColors.info},
      {'action': 'translate_en_ar', 'label': t('ترجمة إنجليزي←عربي', 'Translate EN→AR'), 'icon': Icons.translate_rounded, 'color': AppColors.qaBorder},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.55,
        maxChildSize: 0.7,
        minChildSize: 0.3,
        builder: (_, scrollController) => Container(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: ListView(
          controller: scrollController,
          children: [
            Center(child: Container(width: 36, height: 5, margin: const EdgeInsets.only(bottom: 16),
              color: AppColors.border)),
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.accentFill,
                    border: Border.all(color: AppColors.border, width: Arc.borderWidth),
                  ),
                  // On the electric-green fill the glyph is `onAccent`, never
                  // white: white on this green fails contrast.
                  child: const Icon(Icons.auto_awesome, size: 18, color: AppColors.onAccent),
                ),
                const SizedBox(width: 10),
                Text(t('مساعد AI', 'AI Assistant'),
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              t('اختر إجراء لتطبيقه على هذا المحتوى', 'Choose an action for this content'),
              style: const TextStyle(fontSize: 14, color: AppColors.inkMuted),
            ),
            const SizedBox(height: 18),
            ...actions.map((a) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: GestureDetector(
                onTap: () {
                  Navigator.pop(ctx);
                  _runAIAction(a['action'] as String, block);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: (a['color'] as Color).withValues(alpha: 0.06),
                    borderRadius: BorderRadius.zero,
                  ),
                  child: Row(
                    children: [
                      Icon(a['icon'] as IconData, size: 20, color: a['color'] as Color),
                      const SizedBox(width: 12),
                      Text(a['label'] as String, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      const Spacer(),
                      Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.inkMuted),
                    ],
                  ),
                ),
              ),
            )),
          ],
        ),
      )),
    );
  }

  Future<void> _runAIAction(String action, LessonBlock block) async {
    final t = ref.read(languageProvider.notifier).t;
    // Show loading
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Row(children: [
        const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
        const SizedBox(width: 12),
        Text(t('جاري المعالجة...', 'Processing...')),
      ]),
      duration: const Duration(seconds: 10),
      backgroundColor: AppColors.accent,
    ));

    try {
      final response = await supabase.functions.invoke('ai-assist', body: {
        'action': action,
        'content': block.contentAr ?? '',
        'language': 'ar',
      });

      ScaffoldMessenger.of(context).hideCurrentSnackBar();

      if (response.data != null && response.data['success'] == true) {
        final result = response.data['result'] as String;
        // Update the block content
        await supabase.from('lesson_blocks').update({'content_ar': result}).eq('id', block.id);
        _loadLesson();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(t('تم التحديث بنجاح', 'Updated successfully')),
            backgroundColor: AppColors.success,
          ));
        }
      } else {
        final error = response.data?['error'] ?? 'Unknown error';
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('$error'),
            backgroundColor: AppColors.error,
          ));
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(t('خطأ في خدمة AI: تأكد من إعداد GROQ_API_KEY', 'AI service error: Check GROQ_API_KEY setup')),
          backgroundColor: AppColors.error,
        ));
      }
    }
  }

  void _showPreview(Function t, String lang) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => _PreviewScreen(
        blocks: _blocks,
        title: _titleArController.text,
        t: t,
      ),
    ));
  }

  void _confirmDeleteBlock(String blockId, Function t) {
    showDialog(context: context, builder: (ctx) => AlertDialog(
      title: Text(t('حذف العنصر؟', 'Delete block?') as String),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t('إلغاء', 'Cancel') as String)),
        TextButton(
          onPressed: () async {
            Navigator.pop(ctx);
            await supabase.from('lesson_blocks').delete().eq('id', blockId);
            _loadLesson();
          },
          child: Text(t('حذف', 'Delete') as String, style: const TextStyle(color: AppColors.error)),
        ),
      ],
    ));
  }

  void _confirmDeleteLesson(Function t) {
    showDialog(context: context, builder: (ctx) => AlertDialog(
      title: Text(t('حذف الدرس؟', 'Delete lesson?') as String),
      content: Text(t('لا يمكن التراجع عن هذا', 'This cannot be undone') as String),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t('إلغاء', 'Cancel') as String)),
        TextButton(
          onPressed: () async {
            Navigator.pop(ctx);
            await supabase.from('lessons').delete().eq('id', widget.lessonId!);
            if (mounted) Navigator.pop(context, true);
          },
          child: Text(t('حذف', 'Delete') as String, style: const TextStyle(color: AppColors.error)),
        ),
      ],
    ));
  }
}

// ── Block Card (reorderable) ──
class _BlockCard extends StatelessWidget {
  final LessonBlock block;
  final int index;
  final int total;
  final bool isDark;
  final Function t;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback? onMoveUp;
  final VoidCallback? onMoveDown;
  final VoidCallback onAI;

  const _BlockCard({
    super.key,
    required this.block,
    required this.index,
    required this.total,
    required this.isDark,
    required this.t,
    required this.onEdit,
    required this.onDelete,
    this.onMoveUp,
    this.onMoveDown,
    required this.onAI,
  });

  @override
  Widget build(BuildContext context) {
    final typeInfo = _typeInfo(block.type);
    final color = typeInfo['color'] as Color;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surface,
        borderRadius: BorderRadius.zero,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header: type badge + order arrows ──
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 8, 0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.zero,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(typeInfo['icon'] as IconData, size: 14, color: color),
                      const SizedBox(width: 5),
                      Text('${typeInfo['label']} #${index + 1}',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
                    ],
                  ),
                ),
                const Spacer(),
                // Up/Down arrows
                _arrowBtn(Icons.keyboard_arrow_up_rounded, onMoveUp),
                _arrowBtn(Icons.keyboard_arrow_down_rounded, onMoveDown),
              ],
            ),
          ),

          // ── Full content display ──
          if (block.titleAr != null && block.titleAr!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
              child: Text(
                block.titleAr!,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ),
          if (block.contentAr != null && block.contentAr!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
              child: Text(
                block.contentAr!,
                style: const TextStyle(fontSize: 14, height: 1.7, color: AppColors.inkSecondary),
              ),
            ),
          if (block.url != null && block.url!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
              child: Row(
                children: [
                  const Icon(Icons.link_rounded, size: 14, color: AppColors.info),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(block.url!, style: const TextStyle(fontSize: 12, color: AppColors.info),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                ],
              ),
            ),

          // ── Action bar ──
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Row(
              children: [
                _actionBtn(Icons.edit_rounded, t('تعديل', 'Edit') as String, AppColors.accent, onEdit),
                const SizedBox(width: 6),
                _actionBtn(Icons.auto_awesome_rounded, 'AI', AppColors.accent, onAI),
                const SizedBox(width: 6),
                _actionBtn(Icons.delete_outline_rounded, t('حذف', 'Delete') as String, AppColors.error, onDelete),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _arrowBtn(IconData icon, VoidCallback? onTap) {
    final enabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30, height: 26,
        decoration: BoxDecoration(
          color: enabled ? AppColors.accent.withValues(alpha: 0.08) : Colors.transparent,
          borderRadius: BorderRadius.zero,
        ),
        child: Icon(icon, size: 20, color: enabled ? AppColors.accent : AppColors.inkMuted.withValues(alpha: 0.3)),
      ),
    );
  }

  Widget _actionBtn(IconData icon, String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.zero,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 15, color: color),
              const SizedBox(width: 5),
              Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
            ],
          ),
        ),
      ),
    );
  }

  Map<String, dynamic> _typeInfo(String type) {
    final map = {
      'rich_text': {'label': 'Text', 'icon': Icons.text_fields_rounded, 'color': AppColors.accent},
      'video': {'label': 'Video', 'icon': Icons.videocam_rounded, 'color': AppColors.error},
      'image': {'label': 'Image', 'icon': Icons.image_rounded, 'color': AppColors.success},
      'tip': {'label': 'Tip', 'icon': Icons.lightbulb_rounded, 'color': AppColors.info},
      'warning': {'label': 'Warning', 'icon': Icons.warning_rounded, 'color': AppColors.warning},
      'example': {'label': 'Example', 'icon': Icons.auto_awesome_rounded, 'color': AppColors.success},
      'exercise': {'label': 'Exercise', 'icon': Icons.edit_note_rounded, 'color': AppColors.exerciseBorder},
      'equation': {'label': 'Equation', 'icon': Icons.functions_rounded, 'color': AppColors.equationBorder},
      'qa': {'label': 'Q&A', 'icon': Icons.quiz_rounded, 'color': AppColors.qaBorder},
      'link': {'label': 'Link', 'icon': Icons.link_rounded, 'color': AppColors.inkMuted},
    };
    return map[type] ?? {'label': type, 'icon': Icons.extension_rounded, 'color': AppColors.inkMuted};
  }
}

// ═══════════════════════════════════════
//  PREVIEW SCREEN — Student view
// ═══════════════════════════════════════
class _PreviewScreen extends StatelessWidget {
  final List<LessonBlock> blocks;
  final String title;
  final Function t;

  const _PreviewScreen({required this.blocks, required this.title, required this.t});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(t('معاينة الدرس', 'Lesson Preview') as String),
        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surface,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 3,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.accent, AppColors.accent.withValues(alpha: 0.3)],
              ),
            ),
          ),
        ),
      ),
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.surface,
      body: blocks.isEmpty
          ? Center(
              child: Text(
                t('لا يوجد محتوى للمعاينة', 'No content to preview') as String,
                style: const TextStyle(color: AppColors.inkMuted, fontSize: 16),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Lesson title
                Text(
                  title,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 20),
                // Render all blocks as student sees them
                ...blocks.map((block) => LessonBlockRenderer(block: block)),
              ],
            ),
    );
  }
}
