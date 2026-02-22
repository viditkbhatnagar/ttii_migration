<form action="<?= base_url('admin/training_videos/edit/' . $edit_data['id']) ?>" method="post" enctype="multipart/form-data">
    <div class="row">

        <div class="col-6 form-group p-2">
            <label class="form-label">Title <span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="title" value="<?= esc($edit_data['title']) ?>" required>
        </div>

        <div class="col-6 form-group p-2">
            <label class="form-label">Category <span class="required text-danger">*</span></label>
            <select class="form-control" name="category" id="category" required>
                <option value="Live"      <?= $edit_data['category'] === 'Live' ? 'selected' : '' ?>>Live</option>
                <option value="Lectures"  <?= $edit_data['category'] === 'Lectures' ? 'selected' : '' ?>>Lectures</option>
                <option value="Tutorials" <?= $edit_data['category'] === 'Tutorials' ? 'selected' : '' ?>>Tutorials</option>
            </select>
        </div>

        <div class="col-6 form-group p-2">
            <label class="form-label">Video Type <span class="required text-danger">*</span></label>
            <select class="form-control" name="video_type" id="video_type" required>
                <option value="">Choose Type</option>
                <option value="youtube" <?= $edit_data['video_type'] === 'youtube' ? 'selected' : '' ?>>YouTube</option>
                <option value="vimeo"   <?= $edit_data['video_type'] === 'vimeo'   ? 'selected' : '' ?>>Vimeo</option>
            </select>
        </div>

        <div class="col-6 form-group p-2">
            <label class="form-label">Video URL</label>
            <input type="url" class="form-control" name="video_url" id="video_url"
                   value="<?= esc($edit_data['video_url']) ?>" placeholder="https://...">
        </div>

        <div class="col-6 form-group p-2">
            <label class="form-label">Thumbnail <small class="text-muted">(upload to replace)</small></label>
            <input type="file" class="form-control" name="thumbnail" id="thumbnail" accept="image/*">
        </div>

        <div class="col-6 form-group p-2">
            <label class="form-label">Auto-fetch thumbnail preview</label>
            <div>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="fetchThumbBtn">Fetch Preview</button>
                <span class="ms-2 text-muted small">(auto-loads if URL changes)</span>
            </div>
        </div>

        <div class="col-12 p-2">
            <div id="thumbnailPreview" style="max-width:320px; margin-top:10px; <?= empty($edit_data['thumbnail']) ? 'display:none;' : '' ?>">
                <label class="form-label small">Thumbnail Preview</label>
                <div class="border rounded p-2">
                    <img id="thumbImg"
                         src="<?= !empty($edit_data['thumbnail']) ? base_url(get_file($edit_data['thumbnail'])) : '' ?>"
                         style="width:100%; height:auto; display:block;">
                </div>
            </div>
        </div>

        <div class="col-12 form-group p-2">
            <label class="form-label">Description</label>
            <textarea class="form-textarea editor" name="description" id="editor"><?= esc($edit_data['description']) ?></textarea>
        </div>

        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit">
                <i class="ri-check-fill"></i> Save Changes
            </button>
        </div>

    </div>
</form>

<script>
    // Initialize selects
    $(document).ready(function() {
        $('#category').select2({ dropdownParent: $('#ajax_modal') });
        $('#video_type').select2({ dropdownParent: $('#ajax_modal') });
    });

    // CKEditor
    ClassicEditor.create(document.querySelector('#editor')).catch(e => console.error(e));

    // Helper: extract YouTube ID
    function extractYouTubeID(url) {
        if (!url) return null;
        const reg = /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_\-]{6,})/;
        const m = url.match(reg);
        return m ? m[1] : null;
    }

    // Helper: Vimeo oEmbed
    async function fetchVimeoThumbnail(url) {
        try {
            const res = await fetch('https://vimeo.com/api/oembed.json?url=' + encodeURIComponent(url));
            if (!res.ok) return null;
            const data = await res.json();
            return data.thumbnail_url || null;
        } catch (e) {
            return null;
        }
    }

    // Show preview
    async function fillThumbnailPreview() {
        const videoUrl = $('#video_url').val().trim();
        const videoType = $('#video_type').val();

        if (!videoUrl || !videoType) return;

        let thumb = null;

        if (videoType === 'youtube') {
            const id = extractYouTubeID(videoUrl);
            if (id) thumb = 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg';
        }

        if (videoType === 'vimeo') {
            thumb = await fetchVimeoThumbnail(videoUrl);
        }

        if (thumb) {
            $('#thumbImg').attr('src', thumb);
            $('#thumbnailPreview').show();
        }
    }

    $('#fetchThumbBtn').on('click', fillThumbnailPreview);

    // Auto trigger on change
    $('#video_type, #video_url').on('change blur', function() {
        if ($('#thumbnail')[0].files.length > 0) return;
        fillThumbnailPreview();
    });

    // If user uploads file, preview it
    $('#thumbnail').on('change', function() {
        const file = this.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            $('#thumbImg').attr('src', e.target.result);
            $('#thumbnailPreview').show();
        };
        reader.readAsDataURL(file);
    });
</script>
