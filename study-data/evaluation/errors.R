data = read.csv("final-data-python.csv", sep=",", head=TRUE)
data$prediction_type <- as.factor(data$prediction_type)
data$correctly_drawn <- as.logical(data$correctly_drawn)
data$smiles_length <- nchar(as.character(data$smiles))
data$total_errors <- data$rubs + data$undos

pred_used <- data[data$predictions_used > 0, ]
not_pred_used <- data[data$predictions_used <= 0, ]

##############################################################################################
# t-test between predictions and not predictions for if the structure was drawn correctly or not
#
pred_used_correct = nrow(pred_used[pred_used$correctly_drawn == TRUE,])
not_pred_used_correct = nrow(not_pred_used[not_pred_used$correctly_drawn == TRUE,])

cat("predictions used:", pred_used_correct,"out of", nrow(pred_used), "correct")
cat("predictions not used:", not_pred_used_correct,"out of", nrow(not_pred_used), "correct") 

t.test(x=not_pred_used$correctly_drawn, y=pred_used$correctly_drawn)

##############################################################################################
# t-test between predictions and not predictions for the total number of rubs and undos used
#
sum(pred_used$total_errors)
sum(not_pred_used$total_errors)

mean(pred_used$total_errors)
mean(not_pred_used$total_errors)

mean(pred_used$smiles_length)
mean(not_pred_used$smiles_length)

t.test(x=not_pred_used$total_errors, y=pred_used$total_errors)