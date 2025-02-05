import pandas as pd
import torch
import numpy as np
from transformers import (
    DistilBertTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

# Load data
data = pd.read_csv('backend/model/consulta_resultado.csv')
texts = data['Description'].values
labels = data['IDArticle'].values

# Map labels to IDs
unique_labels = sorted(set(labels))
label_map = {label: i for i, label in enumerate(unique_labels)}
mapped_labels = [label_map[l] for l in labels]

# Train/test split
train_texts, val_texts, train_labels, val_labels = train_test_split(
    texts, mapped_labels, test_size=0.2, random_state=42
)

# Tokenize
tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
train_encodings = tokenizer(list(train_texts), truncation=True, padding=True, max_length=128)
val_encodings = tokenizer(list(val_texts), truncation=True, padding=True, max_length=128)

# Dataset class
class TextDataset(torch.utils.data.Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels
    def __getitem__(self, idx):
        return {
            k: torch.tensor(v[idx]) for k, v in self.encodings.items()
        } | {'labels': torch.tensor(self.labels[idx])}
    def __len__(self):
        return len(self.labels)

train_dataset = TextDataset(train_encodings, train_labels)
val_dataset = TextDataset(val_encodings, val_labels)
data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

# Model
model = AutoModelForSequenceClassification.from_pretrained(
    'distilbert-base-uncased',
    num_labels=len(unique_labels)
)

# Training arguments
training_args = TrainingArguments(
    output_dir='./results',
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    learning_rate=3e-5,
    logging_dir='./logs',
    logging_steps=10,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    data_collator=data_collator
)

# Train
trainer.train()
model.save_pretrained('./saved_model')
tokenizer.save_pretrained('./saved_model')

# Prediction function
def predict(text, model, tokenizer):
    inputs = tokenizer(text, return_tensors='pt', truncation=True)
    with torch.no_grad():
        outputs = model(**inputs)
    return outputs.logits.argmax(dim=-1).item()

# Example
example_text = "CRUZ PVC 110 ENCOLAR"
pred_label_id = predict(example_text, model, tokenizer)
print(f"Predicted label: {unique_labels[pred_label_id]}")

# Evaluate
val_preds = trainer.predict(val_dataset).predictions
val_preds = np.argmax(val_preds, axis=1)
print(classification_report(val_labels, val_preds, labels=range(len(unique_labels)), target_names=[str(label) for label in unique_labels]))
cm = confusion_matrix(val_labels, val_preds)
sns.heatmap(cm, annot=True, fmt='d', xticklabels=unique_labels, yticklabels=unique_labels)
plt.xlabel('Predicted')
plt.ylabel('True')
plt.show()
