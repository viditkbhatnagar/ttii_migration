<form action="<?= base_url('admin/training_videos/add') ?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-6 form-group p-2">
            <label class="form-label">Title <span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="title" required>
        </div>

        <div class="col-6 form-group p-2">
            <label class="form-label">Category <span class="required text-danger">*</span></label>
            <select class="form-control" name="category" id="category" required>
                <option value="">Choose Category</option>
                <option value="Live">Live</option>
                <option value="Lectures">Lectures</option>
                <option value="Tutorials">Tutorials</option>
            </select>
        </div>

        <div class="col-6 form-group p-2">
            <label class="form-label">Video Type <span class="required text-danger">*</span></label>
            <select class="form-control" name="video_type" id="video_type" required>
                <option value="">Choose Type</option>
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
            </select>
        </div>

        <div class="col-6 form-group p-2">
            <label class="form-label">Video URL <small class="text-muted">(YouTube/Vimeo link)</small></label>
            <input type="url" class="form-control" name="video_url" id="video_url" placeholder="https://...">
            <small class="form-text text-muted">Paste the video link. For Live category provide the stream link or channel link.</small>
        </div>

        <div class="col-6 form-group p-2">
            <label class="form-label">Thumbnail <small class="text-muted">(optional — upload to override auto-fetch)</small></label>
            <input type="file" class="form-control" name="thumbnail" id="thumbnail" accept="image/*">
            <small class="form-text text-muted">If you upload a thumbnail it will override auto-fetched thumbnail.</small>
        </div>

        <div class="col-6 form-group p-2">
            <label class="form-label">Auto-fetch thumbnail preview</label>
            <div>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="fetchThumbBtn">Fetch Preview</button>
                <span class="ms-2 text-muted small">(client preview — server will attempt to save on submit if no upload)</span>
            </div>
        </div>

        <div class="col-12 p-2">
            <div id="thumbnailPreview" style="max-width:320px; margin-top:10px; display:none;">
                <label class="form-label small">Thumbnail Preview</label>
                <div class="border rounded p-2">
                    <img id="thumbImg" src="" alt="thumbnail preview" style="width:100%; height:auto; display:block;">
                </div>
            </div>
        </div>

        <div class="col-12 form-group p-2">
            <label class="form-label">Description</label>
            <textarea class="form-textarea editor" name="description" id="editor"></textarea>
        </div>

        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>

<script>
    // init select2 inside modal if used
    $(document).ready(function() {
        $('#category').select2({ dropdownParent: $('#ajax_modal') });
        $('#video_type').select2({ dropdownParent: $('#ajax_modal') });
    });

    

    // CKEditor
    $(document).ready(function() {
        if (document.querySelector('#editor')) {
            ClassicEditor.create(document.querySelector('#editor')).catch(e => console.error(e));
        }
    });

    // Client-side helper: extract YouTube ID
    function extractYouTubeID(url) {
        if (!url) return null;
        const reg = /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_\-]{6,})/;
        const m = url.match(reg);
        return m ? m[1] : null;
    }

    // Client-side helper: fetch Vimeo thumbnail via oEmbed
    async function fetchVimeoThumbnail(url) {
        try {
            const oembed = 'https://vimeo.com/api/oembed.json?url=' + encodeURIComponent(url);
            const res = await fetch(oembed);
            if (!res.ok) return null;
            const data = await res.json();
            return data.thumbnail_url || null;
        } catch (e) {
            return null;
        }
    }

    // Fill preview using video_url and video_type
    async function fillThumbnailPreview() {
        const videoUrl = $('#video_url').val().trim();
        const videoType = $('#video_type').val();
        $('#thumbnailPreview').hide();
        $('#thumbImg').attr('src', '');

        if (!videoUrl || !videoType) return;

        if (videoType === 'youtube') {
            const id = extractYouTubeID(videoUrl);
            if (id) {
                const thumb = 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg';
                $('#thumbImg').attr('src', thumb);
                $('#thumbnailPreview').show();
                return;
            }
        } else if (videoType === 'vimeo') {
            const thumb = await fetchVimeoThumbnail(videoUrl);
            if (thumb) {
                $('#thumbImg').attr('src', thumb);
                $('#thumbnailPreview').show();
                return;
            }
        }
    }

    // on click fetch preview
    $('#fetchThumbBtn').on('click', function() {
        fillThumbnailPreview();
    });

    // also auto-preview when video_type or url changes
    $('#video_type, #video_url').on('change blur', function() {
        // don't override if user uploaded a file
        if ($('#thumbnail')[0].files && $('#thumbnail')[0].files.length > 0) return;
        fillThumbnailPreview();
    });

    // If user selects a local file, show preview and disable fetched preview
    $('#thumbnail').on('change', function(e) {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            $('#thumbImg').attr('src', ev.target.result);
            $('#thumbnailPreview').show();
        };
        reader.readAsDataURL(file);
    });
</script>