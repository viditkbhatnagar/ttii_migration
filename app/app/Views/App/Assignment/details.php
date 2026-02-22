<style>
    .mymcard {
        border-radius: 10px;
        padding: 20px;
    }
    .instruction-box {
        background: #f4f0ff;
        padding: 15px;
        border-radius: 8px;
    }
    .upload-box {
        border: 2px dashed #ff7b54;
        padding: 20px;
        /*text-align: center;*/
        cursor: pointer;
        position: relative;
    }
    .upload-box input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
    }
    .submit-btn {
        background-color: #ff7b54;
        border: none;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 16px;
    }
</style>
<div class=" mt-3">
    <div class="card mymcard shadow">
        <div class="card-body">
            <h4 class="fw-bold"><?= $assignment['title'] ?? '' ?></h4>
            <p><?= $assignment['description'] ?? '' ?></p>
            
            <div class="d-flex align-items-center">
                <i class="ri-calendar-event-line me-2"></i> <span><?= date('d/m/Y', strtotime($assignment['due_date'] ?? ''))  ?></span>
                <i class="ri-time-line ms-3 me-1"></i> <span><?= date('g:i A', strtotime($assignment['from_time'] ?? ''))  ?> - <?= date('g:i A', strtotime($assignment['to_time'] ?? ''))  ?></span>
            </div>

            <div class="instruction-box mt-4">
                <h5 class="fw-bold">Instruction</h5>
                <?= $assignment['instructions'] ?? '' ?>
                <!--<ul class="list-unstyled">-->
                <!--    <li><i class="fas fa-star text-warning"></i> Read the Assignment Prompt Carefully</li>-->
                <!--    <li><i class="fas fa-star text-warning"></i> Submit as a PDF or Word file</li>-->
                <!--    <li><i class="fas fa-star text-warning"></i> Focus on Key Topics</li>-->
                <!--</ul>-->
            </div>

            <form class="mt-4" method="post" enctype="multipart/form-data">
                <label class="fw-bold">Document File</label>
                <div class="mb-3">
                    <a href="<?= base_url(get_file($assignment['file'])) ?>" class="btn btn-light w-100" target="_blank">
                        <i class="fas fa-download"></i> Download Assignment Files
                    </a>
                </div>

                <label class="fw-bold">Upload your Assignment</label>
                <div class="upload-box mb-3" id="uploadBox">
                    <i class="fas fa-upload"></i>
                    <p>Upload File</p>
                    <small class="text-muted">Minimum Size 5 MB</small>
                    <input type="file" id="fileInput" name="file">
                </div>

                <button type="submit" class="submit-btn w-100">SUBMIT</button>
            </form>
        </div>
    </div>
</div>

<script>
    document.getElementById('uploadBox').addEventListener('click', function(event) {
        // Check if the click was on the uploadBox and not on the file input
        if (event.target === this) {
            document.getElementById('fileInput').click();
        }
    });

    document.getElementById('fileInput').addEventListener('change', function(event) {
        const fileName = event.target.files[0] ? event.target.files[0].name : 'Upload File';
        document.querySelector('#uploadBox p').textContent = fileName;
    });
</script>